#!/usr/bin/env bash

set -e

pushd ../qieyun-examples > /dev/null
python build.py > index.js
npm pack
commit_hash="$(git rev-parse --short HEAD)"

popd > /dev/null
tar xvf ../qieyun-examples/qieyun-examples-*.tgz
rm -rf test/
mv package/* .
rm -d package
git commit -a -m "Dist for dev-qieyun-0.13 ${commit_hash}"
