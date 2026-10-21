import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
function deny() { console.error('NETWORK_BLOCKED'); throw new Error('Network access forbidden during synthetic acceptance.'); }
net.Socket.prototype.connect = deny;
net.Server.prototype.listen = deny;
tls.connect = deny;
dgram.createSocket = deny;
globalThis.fetch = deny;
syncBuiltinESMExports();
