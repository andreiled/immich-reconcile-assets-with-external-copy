"use strict";

import crypto from 'crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { getAssetDuplicates, init, deleteAssets } from "@immich/sdk";

const IMMICH_STORED_CHECKSUM_OPTS = Object.freeze({alg: 'sha1', encoding: 'base64'});

const usersWithLibraries = JSON.parse(await fs.readFile("/user_libraries", { encoding: 'utf8' }));

// Process the array elements sequentially rather than in parallel.
usersWithLibraries.reduce(
    (acc, curr) => acc.then(async () => fixDuplicates(curr)),
    Promise.resolve(null)
)

async function fixDuplicates(userParams) {
    const { internalLibrary, externalLibrary, apiKey } = userParams;
    console.info(`Checking ${internalLibrary} for duplicates of assets in ${externalLibrary} ...`);

    init({ baseUrl: "http://immich_server:2283/api", apiKey });

    const assetsToRemove = await findAllInternalLibraryAssetsToRemove();

    if (assetsToRemove.length > 0) {
        console.info(`Found ${assetsToRemove.length} internal library assets with content exactly matching some of the imported library assets`);

        const filesToRemove = assetsToRemove.map(({originalPath}) => originalPath);
        // This allows to save disk space without relying on emptying the trash
        // since the latter will cause the mobile app to reupload all deleted assets that are still available on the phone(s).
        console.info(`Preemptively removing files:
- ${filesToRemove.join('\n- ')}`);
        await Promise.all(filesToRemove.map(path => removeFileSafe(path)));

        const assetIdsToRemove = assetsToRemove.map(({id}) => id);
        console.info(`Deleting (trashing) assets:
- ${assetIdsToRemove.join('\n- ')}`)
        await deleteAssets({assetBulkDeleteDto: {ids: assetIdsToRemove}});
    } else {
        console.info('The internal library has no assets with content exactly matching any of the imported library assets');
    }
}

async function findAllInternalLibraryAssetsToRemove() {
    const duplicates = await getAssetDuplicates();
    console.info(`There are currently ${duplicates.length} duplicates in total.`);

    return (await Promise.all(duplicates.map(async (duplicate) => {
        const internalUploadedAsset = duplicate.assets.find((asset) => !asset.libraryId);
        if (internalUploadedAsset) {
            const importedAssets = duplicate.assets.filter((asset) => !!asset.libraryId);
            if (importedAssets.length > 0) {
                const importedAssetsWithExactlyMatchingContent = await findExactContentDuplicates(internalUploadedAsset, importedAssets);

                console.info(`The uploaded asset ${internalUploadedAsset.id} (${internalUploadedAsset.originalPath}) is an exact duplicate of the following imported asset(s): \
${importedAssetsWithExactlyMatchingContent.map((importedAsset) => `${importedAsset.id} (${importedAsset.originalPath})`).join(', ')}; \
will delete the asset (${internalUploadedAsset.id}).`);

                return {id: internalUploadedAsset.id, originalPath: internalUploadedAsset.originalPath};
            }
        }

        return null;
    }))).filter(it => !!it);
}

async function findExactContentDuplicates(asset, candidates) {
    const expectedChecksum = asset.checksum;
    return (await Promise.all(candidates.map(async (candidate) => [candidate, await checksum(candidate.originalPath)])))
        .filter(([candidate, checksum]) => checksum === expectedChecksum)
        .map(([candidate, checksum]) => candidate);
}

async function checksum(file, options = IMMICH_STORED_CHECKSUM_OPTS) {
    const { alg, encoding } = options;

    return new Promise((resolve, reject) => {
        const digester = crypto.createHash(alg);
        const rs = createReadStream(file);

        rs.on('data', (chunk) => digester.update(chunk));
        rs.on('error', reject);
        rs.on('end', () => resolve(digester.digest(encoding)));
    });
}

async function removeFileSafe(path) {
    try {
        await fs.unlink(path)
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`${path} is already removed`);
        }
    }
}
