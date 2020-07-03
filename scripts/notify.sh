#!/usr/bin/env bash

export color="warning"
export message="Failed"
if [ "$CI_PIPELINE_SUCCESS" = true ]
then 
  color="info"
  message="Passed"
fi

curl ${FAI_QYWX_WEBHOOK} \
-H 'Content-Type: application/json' \
-d "{\"msgtype\":\"markdown\",\"markdown\":{\"content\":\"
### <font color=\\\"${color}\\\">GitlabCI ${message}</font>
> User Name: <font color=\\\"comment\\\">${GITLAB_USER_NAME}</font>
> Pipeline ID: <font color=\\\"comment\\\">${CI_PIPELINE_ID}</font>
> Project Name: <font color=\\\"comment\\\">${CI_PROJECT_NAME}</font>
> Project URL: <font color=\\\"comment\\\">${CI_PROJECT_URL}</font>
> Commit Ref: <font color=\\\"comment\\\">${CI_COMMIT_REF_NAME}</font>
> Commit Tag: <font color=\\\"comment\\\">${CI_COMMIT_TAG}</font>
> Commit SHA: <font color=\\\"comment\\\">${CI_COMMIT_SHA}</font>
> Commit Message: <font color=\\\"comment\\\">${CI_COMMIT_MESSAGE}</font>\"}}"
