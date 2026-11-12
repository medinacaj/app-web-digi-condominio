"""Isolated local Docker+TLS smoke. Uses synthetic identities, never sends mail."""
import http.cookiejar
import json
import os
import socket
import ssl
import subprocess
import tempfile
import time
import urllib.request
import uuid
from pathlib import Path

def docker(*args, capture=True):
    return subprocess.run(['docker',*args],check=True,capture_output=capture,text=True).stdout.strip() if capture else subprocess.run(['docker',*args],check=True).returncode

prefix='digi-smoke-'+uuid.uuid4().hex[:10]
network=prefix+'-net';data=prefix+'-data';ca_data=prefix+'-ca';app=prefix+'-app';proxy=prefix+'-tls'
resources=[]
with tempfile.TemporaryDirectory(prefix='digi-docker-tls-') as td:
    td=Path(td)
    with socket.socket() as p:p.bind(('127.0.0.1',0));port=p.getsockname()[1]
    origin=f'https://localhost:{port}'
    config=td/'Caddyfile';config.write_text('localhost {\n tls internal\n reverse_proxy app:3000\n}\n')
    try:
        docker('network','create',network);resources.append(('network',network))
        for volume in [data,ca_data]:docker('volume','create',volume);resources.append(('volume',volume))
        args=['run','-d','--name',app,'--network',network,'--network-alias','app','-v',data+':/data']
        env={'DIGI_PUBLIC_ORIGIN':origin,'DIGI_TRUST_PROXY':'1','DIGI_MAIL_API_KEY':'synthetic-no-delivery-test','DIGI_MAIL_FROM':'test@example.test','DIGI_ADMIN_EMAIL':'admin@container.test','DIGI_ADMIN_PASSWORD':'ContainerTestPassword123!','DIGI_COMMUNITY_NAME':'Container Pilot'}
        for k,v in env.items():args+=['-e',k+'='+v]
        docker(*args,'digi-condominio:pilot-test');resources.append(('container',app))
        docker('run','-d','--name',proxy,'--network',network,'-p',f'127.0.0.1:{port}:443','-v',str(config)+':/etc/caddy/Caddyfile:ro','-v',ca_data+':/data','-e','NO_PROXY='+os.environ.get('NO_PROXY','')+',app,localhost,127.0.0.1','caddy:2@sha256:ce773ec7a742ce15ee6bf2bb5f65882b9e2a4487b10733e6f1484f86e6b5d8bc');resources.append(('container',proxy))
        ca=td/'root.crt'
        for _ in range(100):
            try:
                docker('cp',proxy+':/data/caddy/pki/authorities/local/root.crt',str(ca));break
            except subprocess.CalledProcessError:time.sleep(.1)
        else:raise RuntimeError('No local CA certificate')
        context=ssl.create_default_context(cafile=str(ca))
        opener=urllib.request.build_opener(urllib.request.HTTPSHandler(context=context))
        def ask(path,body=None,headers=None):
            r=urllib.request.Request(origin+path,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json',**(headers or {})})
            with opener.open(r,timeout=5) as response:return response.status,response.headers,json.loads(response.read())
        for _ in range(100):
            try:
                status,_,health=ask('/api/health')
                if status==200:break
            except OSError:time.sleep(.1)
        else:raise RuntimeError('No TLS health response')
        def login():
            _,headers,result=ask('/api/login',{'email':'admin@container.test','password':'ContainerTestPassword123!'},{'Origin':origin})
            assert 'token' not in result
            cookie=headers['Set-Cookie'].split(';')[0]
            assert 'HttpOnly' in headers['Set-Cookie'] and 'Secure' in headers['Set-Cookie']
            return {'Cookie':cookie,'X-CSRF-Token':result['csrfToken'],'Origin':origin}
        headers=login()
        _,_,communities=ask('/api/communities',headers=headers);community=communities['communities'][0]['id']
        ask('/api/communities/'+community+'/units',{'code':'PERSIST-101','kind':'Departamento'},headers)
        docker('restart',app)
        for _ in range(100):
            try:ask('/api/health');break
            except OSError:time.sleep(.1)
        headers=login();_,_,overview=ask('/api/communities/'+community+'/overview',headers=headers)
        assert overview['units'][0]['code']=='PERSIST-101'
        assert docker('inspect','--format','{{.Config.User}}',app)=='node'
        exposed=json.loads(docker('inspect',app))[0]['NetworkSettings']['Ports']
        assert all(value is None for value in exposed.values())
        print('DOCKER TLS OK: non-root, private backend, verified local TLS, secure cookie, CSRF write, data persisted after restart; no mail sent')
    except Exception:
        for container in [app,proxy]:
            logs=subprocess.run(['docker','logs',container],capture_output=True,text=True)
            print(logs.stdout[-2000:]+logs.stderr[-1000:])
        raise
    finally:
        for kind,name in reversed(resources):
            subprocess.run(['docker',kind,'rm',*(['-f'] if kind=='container' else []),name],capture_output=True)
