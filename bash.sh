#!/bin/bash

# ssh root@101.37.105.86

# scp /Users/sjian/Documents/projects/element-plus-admin/dist.zip root@101.37.105.86:/root/
rm -rf dist.zip
zip -r dist.zip dist/*
scp dist.zip root@web:/root/
ssh root@web << 'EOF'
cd /root/
rm -rf /root/dist
unzip -o dist.zip -d /root/
rm -rf /usr/share/nginx/html1/*
mv /root/dist /usr/share/nginx/html1/
EOF




# 方案二：
# 同时在node_modules/mockjs/src/xhr/xhr.js 文件的第216行和node_modules/mockjs/dist/mock.js文件的大约8312行处添加以下代码

# MockXMLHttpRequest.prototype.upload = xhr.upload;

# 给MockXMLHttpRequest对象添加一个原生xhr.upload方法。