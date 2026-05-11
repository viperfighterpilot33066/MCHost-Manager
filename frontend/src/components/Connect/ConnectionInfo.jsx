import { useState, useEffect } from 'react';
import { Copy, Check, Shield, ShieldAlert, ShieldCheck, Flame, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { network as networkApi, servers as serversApi } from '../../api/client';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button className="btn btn-ghost btn-icon btn-sm" onClick={handle} title={`Copy ${text}`} style={{ padding: '2px 6px' }}>
      {copied ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
    </button>
  );
}

function AddressRow({ label, value, sublabel }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <code style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', color: 'var(--primary)' }}>
          {value}
        </code>
        <CopyButton text={value} />
      </div>
    </div>
  );
}

function SecurityCheck({ icon: Icon, label, ok, warning, onFix }) {
  const color = ok ? 'var(--success)' : warning ? 'var(--warning)' : 'var(--danger)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <Icon size={14} style={{ color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, flex: 1, color: ok ? 'var(--text)' : color }}>{label}</span>
      {!ok && onFix && (
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={onFix}>Fix</button>
      )}
    </div>
  );
}

export default function ConnectionInfo({ server }) {
  const [netInfo, setNetInfo] = useState(null);
  const [properties, setProperties] = useState(null);
  const [openingFirewall, setOpeningFirewall] = useState(false);
  const [showPortGuide, setShowPortGuide] = useState(false);

  useEffect(() => {
    networkApi.info().then(setNetInfo).catch(() => {});
    serversApi.getProperties(server.id).then(setProperties).catch(() => {});
  }, [server.id]);

  const localIp = netInfo?.localIps?.[0];
  const publicIp = netInfo?.publicIp;
  const javaPort = server.port;
  const bedrockPort = server.bedrockPort || 19132;

  const handleOpenFirewall = async () => {
    setOpeningFirewall(true);
    try {
      const result = await serversApi.openFirewall(server.id);
      toast.success(result.message || 'Firewall rules added');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Firewall update failed');
    }
    setOpeningFirewall(false);
  };

  const fixProperty = async (key, value) => {
    try {
      await serversApi.setProperties(server.id, { ...properties, [key]: value });
      setProperties(p => ({ ...p, [key]: value }));
      toast.success(`${key} updated. Restart to apply.`);
    } catch {
      toast.error('Failed to update property');
    }
  };

  const onlineMode = properties?.['online-mode'];
  const whitelist = properties?.['white-list'];
  const bindIp = properties?.['server-ip'];
  const bindRestricted = bindIp === '127.0.0.1' || bindIp === 'localhost';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>

      {/* Connection Addresses */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Connection Addresses</div>

        {publicIp ? (
          <AddressRow
            label="Public IP (internet players)"
            sublabel="Share this with players outside your home network"
            value={`${publicIp}:${javaPort}`}
          />
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            Public IP unavailable — check internet connection
          </div>
        )}

        <AddressRow
          label="Local IP (same WiFi / LAN)"
          sublabel="For players on your home network"
          value={localIp ? `${localIp}:${javaPort}` : null}
        />

        <AddressRow
          label="Java port only"
          sublabel="If players already know your IP"
          value={String(javaPort)}
        />

        {server.geyser && (
          <AddressRow
            label="Bedrock / Mobile / Console (UDP)"
            sublabel="Bedrock Edition players use this port"
            value={`${publicIp || localIp || '?'}:${bedrockPort}`}
          />
        )}
      </div>

      {/* How to Connect — edition-specific steps */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>How to Connect</div>

        {/* Java Edition */}
        {server.type !== 'bedrock' && (
          <div style={{ marginBottom: server.geyser ? 16 : 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Java Edition (PC)
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.9 }}>
              <li>Open <strong style={{ color: 'var(--text)' }}>Minecraft Java Edition</strong></li>
              <li>Click <strong style={{ color: 'var(--text)' }}>Multiplayer</strong></li>
              <li>Click <strong style={{ color: 'var(--text)' }}>Add Server</strong></li>
              <li>In <em>Server Address</em>, paste:
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <code style={{ background: 'var(--surface)', padding: '4px 10px', borderRadius: 6, fontSize: 13, color: 'var(--primary)' }}>
                    {(localIp || publicIp || 'your-ip')}:{javaPort}
                  </code>
                  <CopyButton text={`${localIp || publicIp || 'your-ip'}:${javaPort}`} />
                </div>
              </li>
              <li>Click <strong style={{ color: 'var(--text)' }}>Done</strong> then <strong style={{ color: 'var(--text)' }}>Join Server</strong></li>
            </ol>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--surface)', borderRadius: 6 }}>
              Use the <strong style={{ color: 'var(--text)' }}>Local IP</strong> above if you're on the same WiFi. Use the <strong style={{ color: 'var(--text)' }}>Public IP</strong> for players outside your home (requires port forwarding).
            </div>
          </div>
        )}

        {/* Bedrock Edition — shown for Bedrock servers or when Geyser crossplay is enabled */}
        {(server.type === 'bedrock' || server.geyser) && (
          <div>
            {server.geyser && server.type !== 'bedrock' && (
              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />
            )}
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bedrock Edition (Mobile / Windows 10 / Console)
            </div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.9 }}>
              <li>Open <strong style={{ color: 'var(--text)' }}>Minecraft</strong> (Bedrock / mobile / console)</li>
              <li>Tap <strong style={{ color: 'var(--text)' }}>Play</strong> → <strong style={{ color: 'var(--text)' }}>Servers</strong> tab</li>
              <li>Scroll down and tap <strong style={{ color: 'var(--text)' }}>Add Server</strong></li>
              <li>Fill in:
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 12px', marginTop: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Server Address:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <code style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: 4, color: 'var(--primary)' }}>
                      {localIp || publicIp || 'your-ip'}
                    </code>
                    <CopyButton text={localIp || publicIp || 'your-ip'} />
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>Port:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <code style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: 4, color: 'var(--primary)' }}>
                      {bedrockPort}
                    </code>
                    <CopyButton text={String(bedrockPort)} />
                  </div>
                </div>
              </li>
              <li>Tap <strong style={{ color: 'var(--text)' }}>Save</strong> then tap the server to join</li>
            </ol>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', padding: '6px 10px', background: 'var(--surface)', borderRadius: 6 }}>
              Bedrock uses <strong style={{ color: 'var(--text)' }}>UDP</strong> — make sure to open the UDP firewall port above, not just TCP.
              {server.geyser && <span> Crossplay via <strong style={{ color: 'var(--text)' }}>GeyserMC</strong> — Bedrock players join the Java server seamlessly.</span>}
            </div>
          </div>
        )}

        {/* Warn if server is not running */}
        {server.status !== 'running' && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(210,153,34,0.08)', border: '1px solid var(--warning)', borderRadius: 6, fontSize: 12, color: 'var(--warning)' }}>
            ⚠️ Server is not running — start it first before trying to connect.
          </div>
        )}
      </div>

      {/* Port Forwarding Guide */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <button
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }}
          onClick={() => setShowPortGuide(g => !g)}
        >
          <span style={{ fontWeight: 600, fontSize: 14 }}>How to allow internet players (Port Forwarding)</span>
          {showPortGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showPortGuide && (
          <div style={{ padding: '0 20px 20px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            <ol style={{ paddingLeft: 18, margin: 0 }}>
              <li>Open your router admin page (usually <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>192.168.1.1</code> or <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>192.168.0.1</code> in your browser)</li>
              <li>Find <strong style={{ color: 'var(--text)' }}>Port Forwarding</strong> (sometimes under Advanced / NAT / Firewall)</li>
              <li>Add a new rule: <strong style={{ color: 'var(--text)' }}>TCP port {javaPort}</strong> → your local IP <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: 3 }}>{localIp || '...'}</code></li>
              {server.geyser && <li>Add another rule: <strong style={{ color: 'var(--text)' }}>UDP port {bedrockPort}</strong> → same local IP (for Bedrock players)</li>}
              <li>Save, then share your <strong style={{ color: 'var(--text)' }}>public IP</strong> above with players</li>
            </ol>
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 6, color: 'var(--danger)', fontSize: 12 }}>
              ⚠️ <strong>Never</strong> forward ports 3000 or 3001 — those are the management panel and would give anyone full control of your servers.
            </div>
          </div>
        )}
      </div>

      {/* Firewall */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Windows Firewall</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Automatically add a firewall rule to allow inbound connections on port {javaPort}{server.geyser ? ` and UDP ${bedrockPort}` : ''}.
          Requires running MCHost as Administrator.
        </p>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleOpenFirewall}
          disabled={openingFirewall}
        >
          {openingFirewall
            ? <><div className="spinner" style={{ width: 12, height: 12 }} />Opening...</>
            : <><Flame size={13} />Open Firewall Port{server.geyser ? 's' : ''}</>}
        </button>
      </div>

      {/* Security Checklist */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Security Checklist</div>

        {properties ? (
          <>
            <SecurityCheck
              icon={onlineMode === 'true' ? ShieldCheck : ShieldAlert}
              label={onlineMode === 'true'
                ? 'Online mode is ON — players must have a valid Mojang/Microsoft account'
                : '⚠️ Online mode is OFF — cracked (pirated) clients can join'}
              ok={onlineMode === 'true'}
              onFix={onlineMode !== 'true' ? () => fixProperty('online-mode', 'true') : null}
            />
            <SecurityCheck
              icon={whitelist === 'true' ? ShieldCheck : Shield}
              label={whitelist === 'true'
                ? 'Whitelist is ON — only approved players can join'
                : 'Whitelist is OFF — anyone with your IP can join'}
              ok={whitelist === 'true'}
              warning
              onFix={whitelist !== 'true' ? () => fixProperty('white-list', 'true') : null}
            />
            {bindRestricted && (
              <SecurityCheck
                icon={ShieldAlert}
                label={`server-ip is set to "${bindIp}" — this blocks all outside connections`}
                ok={false}
                onFix={() => fixProperty('server-ip', '')}
              />
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Start the server once to load security status.
          </div>
        )}

        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(248,81,73,0.06)', border: '1px solid rgba(248,81,73,0.2)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)' }}>
          🔒 <strong style={{ color: 'var(--text)' }}>Management panel:</strong> Never expose ports 3000 or 3001 to the internet. Only forward the Minecraft game port{server.geyser ? 's' : ''} above.
        </div>
      </div>
    </div>
  );
}
