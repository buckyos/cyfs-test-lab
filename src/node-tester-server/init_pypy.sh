# centos7

yum install -y epel-release
yum install -y bzip2 wget gcc

cd /opt
rm pypy3-v6.0.0-linux64.tar.bz2
wget https://bitbucket.org/pypy/pypy/downloads/pypy3-v6.0.0-linux64.tar.bz2
tar xvf pypy3-v6.0.0-linux64.tar.bz2
mv pypy3-v6.0.0-linux64 pypy
rm -f pypy3-v6.0.0-linux64.tar.bz2
cd -
/opt/pypy/bin/pypy3 -m ensurepip
/opt/pypy/bin/pip3 install flask gevent gunicorn pymongo redis pycrypto qqwry-py3
