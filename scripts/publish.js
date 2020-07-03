'use strict';

const { execSync } = require('child_process');
const packageJson = require('./package.json');
const semver = require('semver');
const isWindows = require('is-windows');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const cwd = process.cwd();
const fs = require('fs');

function getRunCmdEnv() {
  const env = {};
  Object.keys(process.env).forEach(key => {
    env[key] = process.env[key];
  });
  // make sure `fa-tools/node_modules/.bin` in the PATH env
  const nodeModulesBinDir = path.join(__dirname, './node_modules/.bin');

  Object.entries(env)
    .filter(
      v =>
        v
          .slice(0, 1)
          .pop()
          .toLowerCase() === 'path',
    )
    .forEach(v => {
      const key = v.slice(0, 1).pop();
      env[key] = env[key] ? `${nodeModulesBinDir}:${env[key]}` : nodeModulesBinDir;
    });
  return env;
};

function runCmd(cmd, _args, fn) {
  const args = _args || [];

  if (isWindows()) {
    args.unshift(cmd);
    args.unshift('/c');
    cmd = process.env.ComSpec;
  }

  const runner = require('child_process').spawn(cmd, args, {
    // keep color
    stdio: 'inherit',
    env: getRunCmdEnv(),
  });

  runner.on('close', code => {
    if (fn) {
      fn(code);
    }
  });
}

module.exports = runCmd;


function canNpmPublish() {
  const publishNpm = process.env.PUBLISH_NPM_CLI || 'npm';
  const registry = process.env.PUBLISH_NPM_REGISTRY;
  try {
    const stdout = execSync(
      `${publishNpm} info ${packageJson.name} version ${registry ? '--registry ' + registry : ''}`,
      { encoding: 'utf-8' },
    );
    const remoteVersion = semver.clean(stdout);
    const localVersion = semver.clean(packageJson.version);
    return semver.gtr(localVersion, remoteVersion);
  } catch(e) {
    return true;
  }
}


function tag() {
  console.log('tagging');
  const { version } = packageJson;

  try {
    execSync(`git tag ${version}`);
    execSync(
      `git push ${process.env.FAI_REPOSITORY_URL} ${version}:${version}`,
      );
  } catch(e) {}

  console.log('tagged');
}

function publish(tagString, done) {
  if (!canNpmPublish()) {
    console.log('version not valid and could not publish.');
    return done();
  }

  let args = ['publish', '--with-fa-tools'];
  if (tagString) {
    args = args.concat(['--tag', tagString]);
  }

  // GITLAB CI/CD 自动发布 NPM
  if (process.env.PUBLISH_NPM_USERNAME) {
    // GITLAB 变量
    const registry = process.env.PUBLISH_NPM_REGISTRY;
    const username = process.env.PUBLISH_NPM_USERNAME;
    const password = process.env.PUBLISH_NPM_PASSWORD;
    const email = process.env.PUBLISH_NPM_EMAIL;

    const userconfig = path.join(cwd, '.fnpmrc');
    const prefix = registry.replace(/^https?:/, '');
    fs.writeFileSync(
      userconfig,
      `
      registry=${registry}
      ${prefix}:always-auth=false
      ${prefix}:_password=${password}
      ${prefix}:username=${username}
      ${prefix}:email=${email}
    `,
    );
    console.log(`Built a npm config file to ${userconfig}`);

    args = args.concat(['--userconfig', userconfig, '--registry', registry]);
  }

  const publishNpm = process.env.PUBLISH_NPM_CLI || 'npm';
  runCmd(publishNpm, args, code => {
    if (code) {
      done(code);
      return;
    }

    tag();
  });
}

function pub(done) {
  const notOk = !packageJson.version.match(/^\d+\.\d+\.\d+$/);
  let tagString;
  if (argv['npm-tag']) {
    tagString = argv['npm-tag'];
  }
  if (!tagString && notOk) {
    tagString = 'next';
  }
  if (packageJson.scripts['pre-publish']) {
    runCmd('npm', ['run', 'pre-publish'], code2 => {
      if (code2) {
        done(code2);
        return;
      }

      publish(tagString, done);
    });
  } else {
    publish(tagString, done);
  }
}

pub(function(code) {
  process.exit(code);
});
