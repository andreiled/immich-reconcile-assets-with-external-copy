import fs from 'node:fs/promises';

export type UserLibrariesConfig = {
    internalLibrary: string;
    externalLibrary: string;
    apiKey: string;
};

export async function loadConfig(): Promise<UserLibrariesConfig[]> {
    return JSON.parse(await fs.readFile("/user_libraries", { encoding: 'utf8' }));
}
