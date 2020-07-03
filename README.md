# faiflow-plugin-actions

自动化 CI/CD

这里以目前公共前端中的项目运用为例子说明，感兴趣可以到 gitlab 中查看这几个项目的详细配置情况，例如 `faicomponent`、`faiupload`、`faifooter` 等几个项目

## 准备工作

### GitlabCI 配置文件

gitlab 的 CI/CD 系统通过 `.gitlab-ci.yml` 文件配置构建流程中各个阶段运行的脚本

在项目根目录中创建该文件

```bash
$ cd path/to/your-project/
$ touch .gitlab-ci.yml
```

YAML 是专门用来写配置文件的语言，非常简洁和强大，远比 JSON 格式方便

> 学习指路：[YAML 语言教程- 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2016/07/yaml.html)

在 yml 文件中配置 `stages` 和 `job`，用于定义构建流程的阶段和执行任务，下方是一个可用的最简化配置文件

```yaml
# 定义执行阶段
stages:
  - build
  - notify
# 任务 build
build:
  stage: build
  script:
    - echo "building..."
# 任务 notify_failure
notify_failure:
  stage: notify
  when: on_failure
  script:
    - echo "notify failed"
# 任务 notify_success
notify_success:
  stage: notify
  when: on_success
  script:
    - echo "notify success"
```

`build` 阶段用于执行构建过程中的所有运行脚本，其中大概包含以下几种类型

1. install - 下载依赖，如 `npm install`
2. lint/test - 代码风格检查或单元测试，有时会在 build 阶段后执行，如 `eslint`、`stylelint`、`jest`等
3. build - 通过构建工具编译内容生成文件，如 `webpack`
4. deploy - 将生成文件推送到 gitlab 仓库中存储或者发布到 npm 仓库，通过自定义脚本完成
5. pull - 将生成文件从存储仓库中拉取到某个服务器中，通过自定义脚本完成

`notify` 阶段用于通知当前构建流程是否完全执行完成

* notify_failure - 构建过程中有一个阶段失败会执行
* notify_success - 构建过程中所有阶段成功完成会执行

### GitlabCI 变量

#### npm registry 权限

如果你的项目需要发布到 npm 仓库，需要配置好 npm 验证权限

申请一个团队 npm 账号用于在 ci 中发布代码到私有 npm 仓库中

> 私有 npm 仓库使用指路：[私有 NPM 源使用说明文档](https://train.faisco.cn/knowledgeBase/home?serviceTicket=st-e044658a-49b3-4f49-a1d1-739c53a82d7d#/?viewType=1&selectItemId=node_2841&baseId=274&versionKey=FaiscoITKnowledge-d8648113-645a-4940-b45e-8117ddfc31f7-20191208151646&showUnRead=false)

```bash
$ npm login --registry=http://registry.npm.faidev.cc 
```

在自己的机器中登录之后，查看 npm 配置文件获取 token

```bash
$ vim ~/.npmrc
# 在内容中找到下面的字段
# //registry.npm.faidev.cc/:_password=[your token]
# //registry.npm.faidev.cc/:username=[your name]
# //registry.npm.faidev.cc/:email=[your email]
```

将 token、name、email 字段保存起来，然后到 gitlab 的 ci 变量中配置

1. 打开项目的 gitlab 界面，如 `http://gitlab.faidev.cc/[your team]/[your project]`
2. 在左侧目录中找到 `[设置]->[CI/CD]` 的界面，展开 `变量` 一栏
3. 填入变量名称和变量值
    * 设置 `PUBLISH_NPM_PASSWORD`：值为 token
    * 设置 `PUBLISH_NPM_USERNAME`：值为 name
    * 设置 `PUBLISH_NPM_EMAIL`：值为 email
    * 设置 `PUBLISH_NPM_REGISTRY`：值为 `http://registry.npm.faidev.cc/`

#### gitlab 权限

在 deploy 阶段中需要自动发布代码到 gitlab 仓库中，或者打 tag 等操作，需要配置好 gitlab 验证权限

> 可以注册一个团队用的 gitlab 账号，加入到项目成员中，在 ci 中使用

1. 打开 gitlab 界面，点击右上角的用户头像，点击 `设置`
2. 在左侧目录 User Settings 中找到 `访问令牌` 的界面
3. 在 `Personal Access Tokens` 栏，输入名称为用途名称如 CICD、失效时期为尽量大的值，Scopes 勾选 api 一项即可
4. 点击 `Create personal access token`，将生成令牌，圈选复制起来（注意一定要保存好生成的令牌，退出之后不能再查看）
5. 到 ci 变量界面，设置 `FAI_REPOSITORY_URL` 为请求地址，请求地址为仓库地址、用户名和令牌的组合，如地址`http://gitlab.faidev.cc/your-term/your-project` 、用户名 `fe-term` 和令牌 `abcdefg` 组合成 `http://fe-term:abcdefg@gitlab.faidev.cc/your-term/your-project`  

## 流程阶段

### install

一般为下载 npm 的依赖包

```yaml
build:
  - stage: build
  - script:
    # install
    - fnpm install
    # 没有按照 fnpm 的地方使用 npm/cnpm 都可以
    # - npm install
    # - cnpm install
    # 如果有依赖私有包要指定 registry
    # - npm install --registry=http://registry.npm.faidev.cc
```

### lint/test

进行代码风格检测，一般在 npm scripts 中配好，方便开发时使用

```yaml
build:
  - stage: build
  - script:
    # lint
    - npm run lint
```

举个栗子，在 `package.json` 中编写 scripts

```json
{
  "scripts": {
    "lint:script": "eslint --ext js,vue ./src ./site",
    "lint-fix:script": "eslint --ext js,vue ./src ./site --fix",
    "lint:style": "stylelint \"{src,site}/**/*.less\" --syntax less",
    "lint-fix:style": "stylelint \"{src,site}/**/*.less\" --syntax less --fix",
    "lint-fix": "npm run lint-fix:script && npm run lint-fix:style",
    "lint": "npm run lint:script && npm run lint:style"
  }
}
```

还有进行单元检测的，有些检测会需要到生成文件的就配置到 build 阶段之后

```yaml
build:
  - stage: build
  - script:
    # test
    - npm run test
```

举个栗子，在 `package.json` 中编写 scripts

```json
{
  "scripts": {
    "test": "jest --config .jest.js"
  }
}
```

### build

这个阶段会编辑多种环境的产物，也是在 npm scripts 中配好

```yaml
build:
  - stage: build
  - script:
    # dev build
    - npm run dev
    # release build
    - npm run release
    # site build
    - npm run site
```

这里说明一下几个环境

* dev 对应本地环境运行的产物，一般配有 sourcemap，没有经过代码压缩，产物输出到 dist 目录下
* release 对应生产环境运行的产物，没有配 sourcemap，代码经过压缩，产物输出到 release 目录下
* site 对应用于文档展示的产物，例如 antd vue 组件库的文档，产物输出到 _site 目录下

举个栗子，在 `package.json` 中编写 scripts

```json
{
  "scripts": {
    "start": "webpack-dev-server --config webpack.site.dev.js",
    "site": "webpack --config webpack.site.prod.js",
    "dev": "webpack --config webpack.dev.js",
    "release": "webpack --config webpack.prod.js",
  }
}
```

### deploy

#### git 分支存储

这个阶段把 build 中生成的几个产物，推送到对应的 git 分支上存储，这样做的目的是与拉取操作解耦，方便我们到不同的机器上拉取对应的产物来部署代码

```yaml
build:
  - stage: build
  - script:
    # dev deploy
    - FAI_DEPLOY_DIR=dist FAI_TARGET_REPO=deploy-dev sh deploy.sh
    # release deploy
    - FAI_DEPLOY_DIR=release FAI_TARGET_REPO=deploy-release sh deploy.sh
    # site deploy
    - FAI_DEPLOY_DIR=_site FAI_TARGET_REPO=deploy-site sh deploy.sh
```

deploy.sh 是编写好的 shell 脚本，依赖 gitlab 的 ci 的基础变量和自定义变量，和当前命令传入的环境变量

在 scripts/deploy.sh 中可以看详细内容，原理是把某个目录进行 git init 、 git add、 git commit 等操作，最后 git push 到请求地址的仓库中的一个分支

* dist 目录推送到 deploy-dev 分支
* release 目录推送到 deploy-release 分支
* _site 目录推送到 deploy-site 分支

#### 自动 npm 发布

如果是推送到私有 npm 仓库中的，则进行自动 npm 发布操作

由于这个操作是利用 nodejs 的，依赖了几个 npm 包，要先在项目中加到依赖里，在开发的时候下载这几个依赖，之后 package.json 里会记录依赖，到时候 ci 下载阶段就会下载这几个包

```bash
$ npm install minimist is-windows semver --save-dev
```

```yaml
build:
  - stage: build
  - script:
    # npm deploy
    - FAI_REPOSITORY_URL=$FAI_REPOSITORY_URL PUBLISH_NPM_REGISTRY=$PUBLISH_NPM_REGISTRY PUBLISH_NPM_USERNAME=$PUBLISH_NPM_USERNAME PUBLISH_NPM_PASSWORD=$PUBLISH_NPM_PASSWORD PUBLISH_NPM_EMAIL=$PUBLISH_NPM_EMAIL node publish.js
```

在 scripts/publish.js 中可以看详细内容，原理是根据 package.json 的包名和版本号，先查询版本是否有更新，无更新则去掉发布操作；如果有更新，则发布到 npm 仓库中，当然你要自己调整好 npm 要发布的内容；同时还会进行 git tag 操作推送到 gitlab 上，以记录版本代码

### pull

拉取阶段，由于一般 gitlab ci runner 是配置到对应项目的 dev 开发机器上的，本地开发环境的代码也是在这个机器部署，所以可以进行一次本地代码的自动拉取操作

```yaml
build:
  - stage: build
  - script:
    # dev pull
    - FAI_PULL_DIR=~/res/frontend/faifooter_1_0/ FAI_TARGET_REPO=deploy-dev sh pull.sh
```

在 scripts/pull.sh 中可以看详细内容，原理是到部署目录中生成一个临时目录，然后进行 git pull 操作，通过 cp 命令将临时目录的代码替换到部署目录的代码，最后删除临时目录

另外，dep 环境的机器没有自动脚本登录的权限，只能手动到机器上进行上述操作进行代码拉取，一般就是将 deploy-release 分支的代码拉到相应的部署目录

### notify

通知阶段，由于构建流程耗时往往需要相对的一段时间，为了方便开发者及时了解 ci 结果，利用企业微信的群机器人进行消息推送

> 企业微信群机器人配置指路：[如何配置群机器人？](https://work.weixin.qq.com/help?doc_id=13376)

先进行准备工作，新建一个群聊，拉项目人员进入，右键群的 tab 出现下拉菜单，点击 `添加群机器人`，复制群机器人描述里的 `Webhook地址`，添加到项目 ci 变量 `FAI_QYWX_WEBHOOK` 中

配置文件中添加任务

```yaml
# 通知
notify_failure:
  stage: notify
  when: on_failure
  script:
    - CI_PIPELINE_SUCCESS=false sh notify.sh

# 通知
notify_success:
  stage: notify
  when: on_success
  script:
    - CI_PIPELINE_SUCCESS=true sh notify.sh
```

### 注意事项

ci 构建的触发只在 master 分支推送时发送，需要配置 `only` 为 `master`；还有避免 tag 自动推送时进行重复构建，需要配置 `except` 为 `tags`

## 总结

上面的各个处理方案仍然比较散，没有统一封装起来，会考虑计划使用 @faiflow/cli 脚手架工具把这些逻辑封装起来，方便调用

最后举一个所有阶段的配置栗子

```yaml
stages:
  - build
  - notify

build:
  stage: build
  except:
    - tags
  only:
    - master
  script:
    # install
    - fnpm i
    # lint
    - npm run lint
    # dev build
    - npm run dev
    # release build
    - npm run release
    # site build
    - npm run site
    # dev deploy
    - FAI_DEPLOY_DIR=dist FAI_TARGET_REPO=deploy-dev sh deploy.sh
    # release deploy
    - FAI_DEPLOY_DIR=release FAI_TARGET_REPO=deploy-release sh deploy.sh
    # site deploy
    - FAI_DEPLOY_DIR=_site FAI_TARGET_REPO=deploy-site sh deploy.sh
    # dev pull
    - FAI_PULL_DIR=~/res/frontend/faifooter_1_0/ FAI_TARGET_REPO=deploy-dev sh pull.sh
    # site pull
    - FAI_PULL_DIR=~/web/docs/footer/ FAI_TARGET_REPO=deploy-site sh pull.sh

notify_failure:
  stage: notify
  except:
    - tags
  when: on_failure
  script:
    - CI_PIPELINE_SUCCESS=false sh notify.sh

notify_success:
  stage: notify
  except:
    - tags
  when: on_success
  script:
    - CI_PIPELINE_SUCCESS=true sh notify.sh

```

