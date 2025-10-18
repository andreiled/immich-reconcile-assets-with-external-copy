# immich-reconcile-assets-with-external-copy
Automation script for Immich to reconcile duplicates caused by copying original files directly from the internal library folder to an external library folder.

## Why do this?
1.  Because I primarily shoot on a camera, I am used to doing basic photo organization tasks 'directly'
    **and** I also wanted a simple way to incorporate into my main library photos that I would occasionally take on my phone.
1.  At the same time, I like the convenience of casually browsing and sharing photos using Immich frontend
    as well more advanced features (e.g. duplicates detection and face recognition).

Enabling auto-upload (backup) in the Immich app and sharing internal Immich library folder via Samba got me halfway there
**but** Immich would then show duplicates of the files that I copied (or moved) directly from the internal library folder
to my main photo library (connected to Immich as an external library).  
This script addresses that problem.

## Getting started

### Expected Immich configuation
While the script itself does not strongly depend on any of the following, this is what I'd expect someone following a workflow similar to mine
to do first if they want to keep doing basic photo organization tasks outside of Immich:
1.  Create an [External Library](https://docs.immich.app/guides/external-library/) in Immich.
1.  Enable auto-upload (aka backup) in the Immich app (Android or iOS).
1.  Enable [Storage Template](https://docs.immich.app/administration/storage-template/).
1.  Configure a human readable _Storage label_ for all users (_Administration > Users_): by default, Immich will use the user UUID.
1.  Share the internal library via a file sharing protocol of your choosing.

    For example, use Samba if you primarily browse the photos from Windows (regardless of what OS you use to host Immich itself).

### Install and schedule the script
1.  Download the script and other related files.

    -   Run the following command in the directory containing the `docker-compose.yaml` configuration file for Immich.

        ```bash
        git clone git@github.com:andreiled/immich-reconcile-assets-with-external-copy.git reconcile-assets-with-external-copy
        ```

    -   _[Advanced]_ If like me you are tracking all your services configuration using Git (i.e. the the directory containing the `docker-compose.yaml` file is already a part of a Git repository),
        then run the following command from the same directory instead:

        ```bash
        git submodule add git@github.com:andreiled/immich-reconcile-assets-with-external-copy.git reconcile-assets-with-external-copy
        ```

1.  Make the following changes to the `docker-compose.yaml` file (the same file that defines all services and resources for Immich):

    1.  Add the following to the very end:

        ```yaml
        configs:
          user_libraries:
            file: ./user_libraries.json
        ```

    1.  Add the following to the end of the `services` section:

        ```yaml
        reconcile-assets-with-external-copy:
          build: reconcile-assets-with-external-copy
          configs:
            - user_libraries
          volumes:
            - ${UPLOAD_LOCATION}/library:/data/library
            # External (to Immich) libraries.
            # TODO: copy & paste all bind mounts for all external libraries from the `immich-server` service.

          # This container contains scripts called on a schedule from the host.
          restart: "no"
        ```

1.  Create a new API key for each user with the following permissions: `asset.read`, `asset.update`, `duplicate.read`, `asset.delete`.
1.  Create a new `user_libraries.json` file in the same directory (i.e. where the `docker-compose.yaml` file is) with the following content:

    ```json
    [
        {"internalLibrary": "/library/USER_STORAGE_LABEL", "externalLibrary": "USER_EXTERNAL_LIBRARY_PATH", "apiKey": "USER_API_KEY"}
    ]
    ```

    _Note_: repeat the `{ ... }` part for each user.

1.  Use a text editor of your choice to create a new `/etc/cron.d/immich` file with the following content (need `sudo` for this):

    ```bash
    # Custom Immich automations

    SHELL=/bin/sh
    PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

    # Example of job definition:
    # .---------------- minute (0 - 59)
    # |  .------------- hour (0 - 23)
    # |  |  .---------- day of month (1 - 31)
    # |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
    # |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
    # |  |  |  |  |
    # *  *  *  *  * user-name command to be executed
    # Remove older recordings keeping recordings from at least the last 7 _full_ days (i.e. not counting today)
    0 1 * * *      root    docker compose run reconcile-assets-with-external-copy >> "/var/log/immich/$( date '+\%Y-\%m' ).reconcile-assets-with-external-copy.log" 2>&1
    #
    ```

    _Note_: tweak the log file name to your liking and pre-create the directory for log files in advance (e.g. `sudo mkdir -p /var/log/immich`).

## Development tips

1.  Use `./npm-wrapper.sh install ...` instead of `npm install ...` if you are working on a machine
    where you cannot or do not want to install dependencies such as NodeJS locally.
