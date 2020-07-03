#!/usr/bin/env bash

cd $FAI_DEPLOY_DIR
git init
git config user.name $GITLAB_USER_NAME
git config user.email $GITLAB_USER_EMAIL
git add .
git commit -m "${CI_COMMIT_MESSAGE}"
git push $FAI_REPOSITORY_URL master:$FAI_TARGET_REPO -f