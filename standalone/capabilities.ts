import { SCOPES, DOCX_SCOPES } from '../snapshots/sites-adapter-0.1.0-sites.8/src/feishu.ts';
import { READ_SCOPES } from '../snapshots/sites-adapter-0.1.0-sites.8/src/readonly.ts';
import { WRITE_SCOPES } from '../snapshots/sites-adapter-0.1.0-sites.8/src/write-contracts.ts';
export const READ_CAPABILITIES = [...new Set([...SCOPES, ...DOCX_SCOPES, ...READ_SCOPES])];
export const WRITE_CAPABILITIES = WRITE_SCOPES;
