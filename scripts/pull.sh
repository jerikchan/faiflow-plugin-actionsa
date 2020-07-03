#!/usr/bin/env bash

# 初始化目录
mkdir -p $FAI_PULL_DIR

# 初始化临时目录
rm -rf $FAI_PULL_DIR/__temp__
mkdir -p $FAI_PULL_DIR/__temp__

# 进入临时目录下载文件
cd $FAI_PULL_DIR/__temp__
git init
git pull $FAI_REPOSITORY_URL $FAI_TARGET_REPO

# 将文件从临时目录拷贝的目标目录
cp -r $FAI_PULL_DIR/__temp__/* $FAI_PULL_DIR/

# 清楚临时目录
rm -rf $FAI_PULL_DIR/__temp__