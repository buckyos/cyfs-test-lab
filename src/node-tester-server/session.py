
from flask import make_response, json
import hashlib
import datetime

SALT = 'BUCKY'

class Session:
    def login(self, data):
        # m = hashlib.sha256()
        pwd = (str(data['password']) + SALT).encode()
        session = hashlib.md5(pwd).hexdigest()

        if not self.check(session):
            return json.dumps({"errcode": 100, "msg": "密码错误"})

        rep = make_response('{"errcode": 0, "data": ""}')

        expire_date = datetime.datetime.now()
        expire_date = expire_date + datetime.timedelta(days=3)
        rep.set_cookie('session', session, expires=expire_date)
        return rep

    def check(self, sess):
        password = 'buckyos'
        m = hashlib.md5((password + SALT).encode()).hexdigest()
        print(m, sess)

        return m == sess

    def delete(self):
        rep = make_response('{"errcode": 1, "msg": "登录态无效"}')
        rep.set_cookie('session', '', expires=0)
        return rep


session = Session()

