import { useEffect, useRef, useState } from 'react';
import { Archive, Check, ChevronDown, LogOut, Menu, Pencil, RefreshCw, Shield, ShieldAlert, X } from 'lucide-react';
import AppSidebar from './AppSidebar.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { getGuildBackups, getGuildSettings, postGuildAction } from '../lib/api.js';
import { formatDashboardTimestamp } from '../lib/formatters.js';

const BACKUP_LIMITS = [25, 50, 100];
const ANTINUKE_THRESHOLD_DEFAULTS = {
  channelDelete: { limit: 3, windowSeconds: 10 },
  channelCreate: { limit: 3, windowSeconds: 10 },
  roleDelete: { limit: 3, windowSeconds: 10 },
  roleCreate: { limit: 3, windowSeconds: 10 },
  memberRemoval: { limit: 3, windowSeconds: 15 },
  webhookCreate: { limit: 2, windowSeconds: 30 }
};
const RAID_SETTINGS_DEFAULTS = {
  enabled: true, watch_joins: 5, watch_window_seconds: 30,
  mode_joins: 10, mode_window_seconds: 15, suspicious_ratio: 0.5
};
const TRACKING_SETTINGS_DEFAULTS = {
  tier_suspicious_score: 2, tier_high_risk_score: 3, tier_critical_score: 4,
  tracking_duration_hours: 48, username_entropy_threshold: 4.2, channelId: ''
};
const ANTINUKE_CATEGORIES = Object.keys(ANTINUKE_THRESHOLD_DEFAULTS);

function createSettingsDraft(settings = {}) {
  const modules = settings.modules || {};
  const antiNuke = modules.antiNuke || {};
  const thresholds = Object.fromEntries(ANTINUKE_CATEGORIES.map((category) => [
    category,
    { ...ANTINUKE_THRESHOLD_DEFAULTS[category], ...(antiNuke.thresholds?.[category] || {}) }
  ]));
  return {
    general: {
      language: settings.language === 'en' ? 'en' : 'ar',
      securityLogChannelId: settings.securityLogChannelId || '',
      ownerAlertsEnabled: settings.ownerAlertsEnabled !== false
    },
    antinuke: {
      enabled: antiNuke.enabled !== false,
      mode: antiNuke.mode === 'monitor' ? 'monitor' : 'enforce',
      unauthorizedBotAction: antiNuke.unauthorizedBotAction === 'kick' ? 'kick' : 'quarantine',
      quarantineRoleId: antiNuke.quarantineRoleId || '',
      quarantineTimeoutHours: antiNuke.quarantineTimeoutHours ?? 24,
      escalation: {
        banAfterBreaches: antiNuke.escalation?.banAfterBreaches ?? 2,
        windowMinutes: antiNuke.escalation?.windowMinutes ?? 60
      },
      thresholds
    },
    raid: { ...RAID_SETTINGS_DEFAULTS, ...(modules.raid || {}) },
    tracking: { ...TRACKING_SETTINGS_DEFAULTS, ...(modules.tracking || {}) },
    alerts: { channelId: modules.alerts?.channelId || '' },
    appeals: { reviewChannelId: modules.appeals?.reviewChannelId || '' }
  };
}

function SettingField({ label, description, children }) {
  return <label className="settings-field"><span>{label}</span>{description && <small>{description}</small>}{children}</label>;
}

function SettingToggle({ label, description, checked, disabled, onChange }) {
  return (
    <label className="settings-toggle">
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function NumberSetting({ label, value, min, max, step = 1, disabled, onChange }) {
  return (
    <SettingField label={label}>
      <input type="number" value={value} min={min} max={max} step={step} required disabled={disabled}
        onChange={(event) => onChange(event.target.value)} />
    </SettingField>
  );
}

function ChannelSetting({ label, emptyLabel, id, value, channels, channelsState, disabled, t, onChange, onReload }) {
  const currentUnavailable = value && !channels.some((channel) => channel.id === value);
  return (
    <div className="settings-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} disabled={disabled || channelsState === 'loading'} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel || t.useDefaultChannel}</option>
        {currentUnavailable && <option value={value}>{t.unavailableCurrentChannel}</option>}
        {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}{channel.type === 'announcement' ? ` · ${t.announcementChannel}` : ''}</option>)}
      </select>
      {channelsState === 'loading' && <small role="status">{t.loadingChannels}</small>}
      {channelsState === 'error' && <><button className="settings-inline-action" type="button" onClick={onReload} disabled={disabled}>{t.reloadChannels}</button><small className="settings-field-error" role="alert">{t.channelOptionsError}</small></>}
    </div>
  );
}

function RoleSetting({ label, value, roles, channelsState, disabled, t, onChange, onReload }) {
  const currentUnavailable = value && !roles.some((role) => role.id === value);
  return (
    <SettingField label={label}>
      <select value={value} disabled={disabled || channelsState === 'loading'} onChange={(event) => onChange(event.target.value)}>
        <option value="">{t.noQuarantineRole}</option>
        {currentUnavailable && <option value={value}>{t.unavailableCurrentRole}</option>}
        {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
      </select>
      <small>{t.quarantineRoleHelp}</small>
      {channelsState === 'error' && <button className="settings-inline-action" type="button" onClick={onReload} disabled={disabled}>{t.reloadChannels}</button>}
    </SettingField>
  );
}

function serializeSettingsDraft(draft, changedSections) {
  const settings = {};
  if (changedSections.includes('general')) {
    settings.general = {
      ...draft.general,
      securityLogChannelId: draft.general.securityLogChannelId || null
    };
  }
  if (changedSections.includes('antinuke')) {
    settings.antinuke = {
      ...draft.antinuke,
      quarantineRoleId: draft.antinuke.quarantineRoleId || null,
      quarantineTimeoutHours: Number(draft.antinuke.quarantineTimeoutHours),
      escalation: {
        banAfterBreaches: Number(draft.antinuke.escalation.banAfterBreaches),
        windowMinutes: Number(draft.antinuke.escalation.windowMinutes)
      },
      thresholds: Object.fromEntries(ANTINUKE_CATEGORIES.map((category) => [
        category,
        {
          limit: Number(draft.antinuke.thresholds[category].limit),
          windowSeconds: Number(draft.antinuke.thresholds[category].windowSeconds)
        }
      ]))
    };
  }
  if (changedSections.includes('raid')) {
    settings.raid = {
      ...draft.raid,
      watch_joins: Number(draft.raid.watch_joins),
      watch_window_seconds: Number(draft.raid.watch_window_seconds),
      mode_joins: Number(draft.raid.mode_joins),
      mode_window_seconds: Number(draft.raid.mode_window_seconds),
      suspicious_ratio: Number(draft.raid.suspicious_ratio)
    };
  }
  if (changedSections.includes('tracking')) {
    settings.tracking = {
      ...draft.tracking,
      tier_suspicious_score: Number(draft.tracking.tier_suspicious_score),
      tier_high_risk_score: Number(draft.tracking.tier_high_risk_score),
      tier_critical_score: Number(draft.tracking.tier_critical_score),
      tracking_duration_hours: Number(draft.tracking.tracking_duration_hours),
      username_entropy_threshold: Number(draft.tracking.username_entropy_threshold),
      channelId: draft.tracking.channelId || null
    };
  }
  if (changedSections.includes('alerts')) settings.alerts = { channelId: draft.alerts.channelId || null };
  if (changedSections.includes('appeals')) settings.appeals = { reviewChannelId: draft.appeals.reviewChannelId || null };
  return settings;
}

function formatBytes(value, language, fallback) {
  if (!Number.isSafeInteger(value) || value < 0) return fallback;
  if (value < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value;
  let index = -1;
  do { size /= 1024; index += 1; } while (size >= 1024 && index < units.length - 1);
  return `${new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en', { maximumFractionDigits: 1 }).format(size)} ${units[index]}`;
}

function LockdownControls({ canManageGuild, t, onAction, busy }) {
  if (!canManageGuild) return null;
  return (
    <section className="read-info-card panel">
      <div className="read-section-heading"><div><h2>{t.lockdownControls}</h2><p>{t.lockdownWarning}</p></div><ShieldAlert size={17} aria-hidden="true" /></div>
      <div className="tracking-action-buttons">
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm(t.confirmLockdownStart)) onAction('lockdown-start', { reason: t.dashboardLockdownReason });
        }}>{t.startLockdown}</button>
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm(t.confirmLockdownEnd)) onAction('lockdown-end', { reason: t.dashboardLockdownEndReason });
        }}>{t.endLockdown}</button>
      </div>
    </section>
  );
}

function SettingsContent({
  data, language, t, guild, onSaveSettings, busy,
  channelOptions, roleOptions, channelsState, onReloadChannels
}) {
  const [draft, setDraft] = useState(() => createSettingsDraft(data?.settings));
  const [baseline, setBaseline] = useState(() => createSettingsDraft(data?.settings));
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const saved = createSettingsDraft(data?.settings);
    setDraft(saved);
    setBaseline(saved);
    setValidationError('');
  }, [data]);

  if (guild.owner !== true) {
    return <section className="settings-owner-note panel"><Shield size={18} aria-hidden="true" /><p>{t.settingsOwnerOnly}</p></section>;
  }

  const changedSections = ['general', 'antinuke', 'raid', 'tracking', 'alerts', 'appeals'].filter((section) =>
    JSON.stringify(draft[section]) !== JSON.stringify(baseline[section])
  );
  const trackingOrderValid =
    Number(draft.tracking.tier_suspicious_score) <= Number(draft.tracking.tier_high_risk_score) &&
    Number(draft.tracking.tier_high_risk_score) <= Number(draft.tracking.tier_critical_score);
  const updateField = (section, key, value) => {
    setDraft((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
    setValidationError('');
  };
  const updateThreshold = (category, key, value) => {
    setDraft((current) => ({
      ...current,
      antinuke: {
        ...current.antinuke,
        thresholds: {
          ...current.antinuke.thresholds,
          [category]: { ...current.antinuke.thresholds[category], [key]: value }
        }
      }
    }));
    setValidationError('');
  };

  return (
    <div className="settings-page">
      <form className="settings-form" onSubmit={(event) => {
        event.preventDefault();
        if (!trackingOrderValid) {
          setValidationError(t.settingsValidation);
          return;
        }
        if (baseline.antinuke.enabled && !draft.antinuke.enabled && !window.confirm(t.confirmDisableAntiNuke)) return;
        if (baseline.raid.enabled && !draft.raid.enabled && !window.confirm(t.confirmDisableRaid)) return;
        if (baseline.general.securityLogChannelId && !draft.general.securityLogChannelId && !window.confirm(t.confirmClearSecurityChannel)) return;
        setValidationError('');
        onSaveSettings(serializeSettingsDraft(draft, changedSections));
      }}>
        <header className="settings-page-heading">
          <div><h1>{t.settingsEditor}</h1><p>{t.settingsEditSummary}</p></div>
        </header>

        <details className="settings-group settings-disclosure panel">
          <summary className="settings-group-heading"><h2>{t.generalSettings}</h2><ChevronDown className="settings-disclosure-chevron" size={18} aria-hidden="true" /></summary>
          <div className="settings-group-content">
          <p className="settings-group-description">{t.settingsGeneralDescription}</p>
          <div className="settings-control-grid">
            <SettingField label={t.botLanguage}>
              <select value={draft.general.language} disabled={busy} onChange={(event) => updateField('general', 'language', event.target.value)}>
                <option value="ar">{t.arabic}</option><option value="en">{t.english}</option>
              </select>
            </SettingField>
            <ChannelSetting id="settings-security-channel" label={t.securityLogChannel} emptyLabel={t.disableSecurityChannel}
              value={draft.general.securityLogChannelId} channels={channelOptions} channelsState={channelsState} disabled={busy} t={t} onReload={onReloadChannels}
              onChange={(value) => updateField('general', 'securityLogChannelId', value)} />
          </div>
          <SettingToggle label={t.ownerAlerts} checked={draft.general.ownerAlertsEnabled} disabled={busy}
            onChange={(value) => updateField('general', 'ownerAlertsEnabled', value)} />
          </div>
        </details>

        <details className="settings-group settings-disclosure panel">
          <summary className="settings-group-heading"><h2>{t.antiNukeControls}</h2><ChevronDown className="settings-disclosure-chevron" size={18} aria-hidden="true" /></summary>
          <div className="settings-group-content">
          <p className="settings-group-description">{t.antiNukeDescription}</p>
          <SettingToggle label={t.protectionEnabled} description={t.enableProtectionDescription} checked={draft.antinuke.enabled} disabled={busy}
            onChange={(value) => updateField('antinuke', 'enabled', value)} />
          <div className="settings-control-grid settings-control-grid-compact">
            <SettingField label={t.mode}>
              <select value={draft.antinuke.mode} disabled={busy} onChange={(event) => updateField('antinuke', 'mode', event.target.value)}>
                <option value="enforce">{t.enforceMode}</option><option value="monitor">{t.monitorMode}</option>
              </select>
            </SettingField>
            <SettingField label={t.unauthorizedBotAction}>
              <select value={draft.antinuke.unauthorizedBotAction} disabled={busy} onChange={(event) => updateField('antinuke', 'unauthorizedBotAction', event.target.value)}>
                <option value="quarantine">{t.quarantine}</option><option value="kick">{t.kick}</option>
              </select>
            </SettingField>
            <RoleSetting label={t.quarantineRole} value={draft.antinuke.quarantineRoleId} roles={roleOptions} channelsState={channelsState} disabled={busy} t={t} onReload={onReloadChannels}
              onChange={(value) => updateField('antinuke', 'quarantineRoleId', value)} />
            <NumberSetting label={t.quarantineTimeout} value={draft.antinuke.quarantineTimeoutHours} min="1" max="672" disabled={busy}
              onChange={(value) => updateField('antinuke', 'quarantineTimeoutHours', value)} />
          </div>
          <h3 className="settings-subheading">{t.thresholdGroup}</h3>
          <div className="settings-threshold-grid">{ANTINUKE_CATEGORIES.map((category) => (
            <fieldset className="settings-threshold" key={category}>
              <legend>{t[category]}</legend>
              <NumberSetting label={t.limit} value={draft.antinuke.thresholds[category].limit} min="1" max="50" disabled={busy}
                onChange={(value) => updateThreshold(category, 'limit', value)} />
              <NumberSetting label={t.windowSeconds} value={draft.antinuke.thresholds[category].windowSeconds} min="3" max="300" disabled={busy}
                onChange={(value) => updateThreshold(category, 'windowSeconds', value)} />
            </fieldset>
          ))}</div>
          <h3 className="settings-subheading">{t.escalation}</h3>
          <div className="settings-control-grid settings-control-grid-compact">
            <NumberSetting label={t.banAfterBreaches} value={draft.antinuke.escalation.banAfterBreaches} min="2" max="10" disabled={busy}
              onChange={(value) => setDraft((current) => ({ ...current, antinuke: { ...current.antinuke, escalation: { ...current.antinuke.escalation, banAfterBreaches: value } } }))} />
            <NumberSetting label={t.windowMinutes} value={draft.antinuke.escalation.windowMinutes} min="5" max="1440" disabled={busy}
              onChange={(value) => setDraft((current) => ({ ...current, antinuke: { ...current.antinuke, escalation: { ...current.antinuke.escalation, windowMinutes: value } } }))} />
          </div>
          </div>
        </details>

        <details className="settings-group settings-disclosure panel">
          <summary className="settings-group-heading"><h2>{t.raidModule}</h2><ChevronDown className="settings-disclosure-chevron" size={18} aria-hidden="true" /></summary>
          <div className="settings-group-content">
          <p className="settings-group-description">{t.raidDescription}</p>
          <SettingToggle label={t.protectionEnabled} description={t.enableProtectionDescription} checked={draft.raid.enabled} disabled={busy}
            onChange={(value) => updateField('raid', 'enabled', value)} />
          <div className="settings-subheading">{t.joinThresholds}</div>
          <div className="settings-control-grid">
            <NumberSetting label={t.watchJoins} value={draft.raid.watch_joins} min="2" max="100" disabled={busy}
              onChange={(value) => updateField('raid', 'watch_joins', value)} />
            <NumberSetting label={t.watchWindow} value={draft.raid.watch_window_seconds} min="5" max="300" disabled={busy}
              onChange={(value) => updateField('raid', 'watch_window_seconds', value)} />
            <NumberSetting label={t.modeJoins} value={draft.raid.mode_joins} min="3" max="200" disabled={busy}
              onChange={(value) => updateField('raid', 'mode_joins', value)} />
            <NumberSetting label={t.modeWindow} value={draft.raid.mode_window_seconds} min="5" max="300" disabled={busy}
              onChange={(value) => updateField('raid', 'mode_window_seconds', value)} />
            <NumberSetting label={t.suspiciousRatio} value={draft.raid.suspicious_ratio} min="0" max="1" step="0.05" disabled={busy}
              onChange={(value) => updateField('raid', 'suspicious_ratio', value)} />
          </div>
          </div>
        </details>

        <details className="settings-group settings-disclosure panel">
          <summary className="settings-group-heading"><h2>{t.trackingModule}</h2><ChevronDown className="settings-disclosure-chevron" size={18} aria-hidden="true" /></summary>
          <div className="settings-group-content">
          <p className="settings-group-description">{t.trackingDescription}</p>
          <div className="settings-control-grid">
            <NumberSetting label={t.suspiciousScore} value={draft.tracking.tier_suspicious_score} min="1" max="5" disabled={busy}
              onChange={(value) => updateField('tracking', 'tier_suspicious_score', value)} />
            <NumberSetting label={t.highRiskScore} value={draft.tracking.tier_high_risk_score} min="2" max="6" disabled={busy}
              onChange={(value) => updateField('tracking', 'tier_high_risk_score', value)} />
            <NumberSetting label={t.criticalScore} value={draft.tracking.tier_critical_score} min="3" max="8" disabled={busy}
              onChange={(value) => updateField('tracking', 'tier_critical_score', value)} />
            <NumberSetting label={t.trackingDuration} value={draft.tracking.tracking_duration_hours} min="12" max="168" disabled={busy}
              onChange={(value) => updateField('tracking', 'tracking_duration_hours', value)} />
            <NumberSetting label={t.usernameEntropy} value={draft.tracking.username_entropy_threshold} min="2" max="6" step="0.1" disabled={busy}
              onChange={(value) => updateField('tracking', 'username_entropy_threshold', value)} />
            <ChannelSetting id="settings-tracking-channel" label={t.trackingChannel} value={draft.tracking.channelId}
              channels={channelOptions} channelsState={channelsState} disabled={busy} t={t} onReload={onReloadChannels}
              onChange={(value) => updateField('tracking', 'channelId', value)} />
          </div>
          {!trackingOrderValid && <p className="settings-validation" role="alert">{t.settingsValidation}</p>}
          </div>
        </details>

        <details className="settings-group settings-disclosure panel">
          <summary className="settings-group-heading"><h2>{t.alertsAndAppeals}</h2><ChevronDown className="settings-disclosure-chevron" size={18} aria-hidden="true" /></summary>
          <div className="settings-group-content">
          <p className="settings-group-description">{t.alertsAndAppealsDescription}</p>
          <div className="settings-control-grid">
            <ChannelSetting id="settings-alerts-channel" label={t.alertChannel} value={draft.alerts.channelId}
              channels={channelOptions} channelsState={channelsState} disabled={busy} t={t} onReload={onReloadChannels}
              onChange={(value) => updateField('alerts', 'channelId', value)} />
            <ChannelSetting id="settings-appeals-channel" label={t.appealsChannel} value={draft.appeals.reviewChannelId}
              channels={channelOptions} channelsState={channelsState} disabled={busy} t={t} onReload={onReloadChannels}
              onChange={(value) => updateField('appeals', 'reviewChannelId', value)} />
          </div>
          </div>
        </details>
        {validationError && <p className="settings-validation" role="alert">{validationError}</p>}
        <div className="settings-save-bar">
          <span className={changedSections.length ? 'settings-dirty' : 'settings-clean'}>{changedSections.length ? t.unsavedChanges : t.noUnsavedChanges}</span>
          <div>
            <button type="button" className="settings-secondary-button" disabled={!changedSections.length || busy} onClick={() => { setDraft(baseline); setValidationError(''); }}>{t.discardChanges}</button>
            <button type="submit" className="settings-save-button" disabled={!changedSections.length || busy || !trackingOrderValid}>
              {busy ? t.settingsSaving : t.saveSettings}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function BackupsContent({
  result, page, limit, onPageChange, setLimit, state, language, t,
  onCreateBackup, onDeleteBackup, onRenameBackup, onPreviewRestore, onConfirmRestore,
  isGuildOwner, backupAction, restorePreview, restoreConfirmCode, setRestoreConfirmCode
}) {
  const [editingBackupId, setEditingBackupId] = useState(null);
  const [backupNameDraft, setBackupNameDraft] = useState('');
  const backups = Array.isArray(result?.items) ? result.items : [];
  const currentPage = Number.isInteger(result?.page) ? result.page : page;
  const hasMore = result?.hasMore === true && currentPage < 50;
  return (
    <>
      <div className="backup-toolbar"><div><h2>{t.backupArchive}</h2><p>{t.backupActionsDetail}</p></div><div className="backup-toolbar-actions"><label><span>{t.rowsPerPage}</span><select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>{BACKUP_LIMITS.map((size) => <option key={size} value={size}>{size}</option>)}</select></label><button type="button" className="refresh-button" onClick={onCreateBackup} disabled={backupAction?.status === 'pending'}><Archive size={15} aria-hidden="true" />{t.createBackup}</button></div></div>
      {backupAction && <p className={`backup-action-feedback ${backupAction.status === 'error' ? 'error' : backupAction.status === 'success' ? 'success' : ''}`} role={backupAction.status === 'error' ? 'alert' : 'status'}>{backupAction.message}</p>}
      {restorePreview && <section className="read-info-card panel restore-preview">
        <div className="read-section-heading"><div><h2>{t.restorePreviewTitle}</h2><p>{t.restorePreviewSummary}</p></div><ShieldAlert size={17} aria-hidden="true" /></div>
        <dl className="backup-metadata">
          <div><dt>{t.restoreAdd}</dt><dd>{restorePreview.summary?.toAdd ?? 0}</dd></div>
          <div><dt>{t.restoreModify}</dt><dd>{restorePreview.summary?.toModify ?? 0}</dd></div>
          <div><dt>{t.restoreRemove}</dt><dd>{restorePreview.summary?.toRemove ?? 0}</dd></div>
          <div><dt>{t.restoreDangerousPermissions}</dt><dd>{restorePreview.dangerousPermissionCount ?? 0}</dd></div>
          <div><dt>{t.restoreWarnings}</dt><dd>{restorePreview.warningCount ?? 0}</dd></div>
        </dl>
        <p className="restore-warning">{t.restoreSafetyNote}</p>
        {Array.isArray(restorePreview.warnings) && restorePreview.warnings.length > 0 && <ul className="restore-warning-list">{restorePreview.warnings.map((warning, index) => <li key={`${index}-${warning}`}>{warning}</li>)}</ul>}
        <p>{t.restoreChallengePrompt} <code dir="ltr">{restorePreview.challenge.code}</code></p>
        <p>{t.restoreChallengeExpires}: {formatDashboardTimestamp(restorePreview.challenge.expiresAt, language, t.timestampInvalid)}</p>
        <form className="setting-action-form restore-confirm-form" onSubmit={(event) => { event.preventDefault(); onConfirmRestore(restorePreview.snapshotId); }}>
          <label className="setting-control"><span>{t.restoreChallengeCode}</span><input value={restoreConfirmCode} onChange={(event) => setRestoreConfirmCode(event.target.value.toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, '').slice(0, 6))} autoComplete="off" maxLength={6} required /></label>
          <button type="submit" disabled={backupAction?.status === 'pending' || restoreConfirmCode.length !== 6}>{t.confirmRestore}</button>
          <button type="button" disabled={backupAction?.status === 'pending'} onClick={() => { setRestoreConfirmCode(''); onPreviewRestore(null); }}>{t.cancel}</button>
        </form>
      </section>}
      {state === 'ready' && backups.length === 0 && <div className="read-page-empty panel"><Archive size={20} aria-hidden="true" /><h2>{t.noBackups}</h2><p>{t.noBackupsDetail}</p></div>}
      {result && backups.length > 0 && <div className="backup-list">{backups.map((backup) => <article className="backup-card panel" key={backup.id}>
        <div className="backup-card-heading"><span className="backup-icon"><Archive size={17} aria-hidden="true" /></span><div className="backup-card-title">
          {isGuildOwner && editingBackupId === backup.id
            ? <form className="backup-rename-form" onSubmit={(event) => { event.preventDefault(); onRenameBackup(backup.id, backupNameDraft); setEditingBackupId(null); }}>
                <input aria-label={t.backupNameLabel} value={backupNameDraft} onChange={(event) => setBackupNameDraft(event.target.value.slice(0, 100))} maxLength={100} required autoFocus />
                <button type="submit" aria-label={t.saveBackupName} title={t.saveBackupName} disabled={backupAction?.status === 'pending' || !backupNameDraft.trim()}><Check size={15} aria-hidden="true" /></button>
                <button type="button" aria-label={t.cancel} title={t.cancel} disabled={backupAction?.status === 'pending'} onClick={() => setEditingBackupId(null)}><X size={15} aria-hidden="true" /></button>
              </form>
            : <div className="backup-card-title-row"><h3>{backup.name || t.unnamedBackup}</h3>{isGuildOwner && <button className="backup-rename-button" type="button" aria-label={t.renameBackup} title={t.renameBackup} disabled={backupAction?.status === 'pending'} onClick={() => { setBackupNameDraft(backup.name || ''); setEditingBackupId(backup.id); }}><Pencil size={13} aria-hidden="true" /><span>{t.renameBackup}</span></button>}</div>}
          <time dateTime={backup.createdAt}>{formatDashboardTimestamp(backup.createdAt, language, t.timestampInvalid)}</time>
        </div></div>
        <dl className="backup-metadata">
          <div><dt>{t.backupType}</dt><dd>{backup.triggerType || t.notAvailable}</dd></div>
          <div><dt>{t.createdBy}</dt><dd><code dir="ltr">{backup.createdBy || t.notAvailable}</code></dd></div>
          <div><dt>{t.schemaVersion}</dt><dd>{Number.isSafeInteger(backup.schemaVersion) ? backup.schemaVersion : t.notAvailable}</dd></div>
          <div><dt>{t.backupSize}</dt><dd>{formatBytes(backup.sizeBytes, language, t.notAvailable)}</dd></div>
          <div><dt>{t.backupRoles}</dt><dd>{backup.counts?.roles ?? t.notAvailable}</dd></div>
          <div><dt>{t.backupCategories}</dt><dd>{backup.counts?.categories ?? t.notAvailable}</dd></div>
          <div><dt>{t.backupChannels}</dt><dd>{backup.counts?.channels ?? t.notAvailable}</dd></div>
        </dl>
        {isGuildOwner && <div className="backup-card-actions">
          <button type="button" disabled={backupAction?.status === 'pending'} onClick={() => onPreviewRestore(backup.id)}>{t.previewRestore}</button>
          <button type="button" className="tracking-action-danger" disabled={backupAction?.status === 'pending'} onClick={() => onDeleteBackup(backup.id)}>{t.deleteBackup}</button>
        </div>}
      </article>)}</div>}
      {result && (currentPage > 1 || hasMore) && <nav className="tracking-pagination" aria-label={t.backupsPagination}><button className="tracking-reset-button" type="button" disabled={currentPage <= 1 || state === 'loading-page'} onClick={() => onPageChange(Math.max(1, currentPage - 1))}>{t.previousPage}</button><span>{t.pageOf(currentPage)}</span><button className="tracking-reset-button" type="button" disabled={!hasMore || state === 'loading-page'} onClick={() => onPageChange(Math.min(50, currentPage + 1))}>{t.nextPage}</button></nav>}
    </>
  );
}

export default function GuildReadOnlyPage({ page, t, language, guild, user, siteAdmin, onNavigate, onSwitchServer, onSignOut, authBusy, onLanguageToggle, onSessionExpired }) {
  const [result, setResult] = useState(null);
  const [state, setState] = useState('loading');
  const [backupPage, setBackupPage] = useState(1);
  const [backupLimit, setBackupLimit] = useState(25);
  const [refreshToken, setRefreshToken] = useState(0);
  const [backupAction, setBackupAction] = useState(null);
  const [settingsAction, setSettingsAction] = useState(null);
  const [channelOptions, setChannelOptions] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [channelsState, setChannelsState] = useState('idle');
  const [restorePreview, setRestorePreview] = useState(null);
  const [restoreConfirmCode, setRestoreConfirmCode] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handledExpiry = useRef(false);
  const refresh = () => setRefreshToken((value) => value + 1);
  const createBackup = async () => {
    if (!window.confirm(t.confirmCreateBackup)) return;
    setBackupAction({ status: 'pending', message: t.backupInProgress });
    try {
      const response = await postGuildAction(guild.id, { action: 'backup-create' });
      setBackupAction({ status: 'success', message: t.backupCreated(response.backup?.id || t.notAvailable) });
      refresh();
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setBackupAction({ status: 'error', message: t.backupCreateFailed(error.message) });
      refresh();
    }
  };
  const deleteBackupFromDashboard = async (snapshotId) => {
    if (!window.confirm(t.confirmDeleteBackup)) return;
    setBackupAction({ status: 'pending', message: t.backupDeleteInProgress });
    try {
      await postGuildAction(guild.id, { action: 'backup-delete', snapshotId });
      setBackupAction({ status: 'success', message: t.backupDeleted });
      refresh();
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      const message = error.message === 'BACKUP_DELETE_AUDIT_FAILED'
        ? t.backupDeletePartial
        : error.message === 'BACKUP_MIGRATION_REQUIRED'
          ? t.backupMigrationRequired
          : error.message === 'RESTORATION_BUSY'
            ? t.backupDeleteBusy
            : t.backupDeleteFailed(error.message);
      setBackupAction({ status: 'error', message });
      refresh();
    }
  };
  const renameBackupFromDashboard = async (snapshotId, backupName) => {
    const normalizedName = backupName.trim();
    if (!normalizedName || normalizedName.length > 100) return;
    setBackupAction({ status: 'pending', message: t.backupRenameInProgress });
    try {
      await postGuildAction(guild.id, { action: 'backup-rename', snapshotId, backupName: normalizedName });
      setBackupAction({ status: 'success', message: t.backupRenamed });
      refresh();
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      const message = error.message === 'BACKUP_RENAME_AUDIT_FAILED' ? t.backupRenamePartial : t.backupRenameFailed(error.message);
      setBackupAction({ status: 'error', message });
    }
  };
  const previewBackupRestore = async (snapshotId) => {
    if (!snapshotId) {
      setRestorePreview(null);
      setRestoreConfirmCode('');
      return;
    }
    setBackupAction({ status: 'pending', message: t.restorePreviewLoading });
    setRestorePreview(null);
    setRestoreConfirmCode('');
    try {
      const preview = await postGuildAction(guild.id, { action: 'backup-restore-preview', snapshotId });
      setRestorePreview(preview);
      setBackupAction({ status: 'success', message: t.restorePreviewReady });
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setBackupAction({ status: 'error', message: t.backupCreateFailed(error.message) });
    }
  };
  const confirmBackupRestore = async (snapshotId) => {
    if (!restorePreview || !window.confirm(t.confirmRestoreFinal)) return;
    setBackupAction({ status: 'pending', message: t.restoreInProgress });
    try {
      await postGuildAction(guild.id, {
        action: 'backup-restore',
        snapshotId,
        challengeCode: restoreConfirmCode,
        nonce: restorePreview.challenge.nonce
      });
      setBackupAction({ status: 'success', message: t.restoreCompleted });
      setRestorePreview(null);
      setRestoreConfirmCode('');
      refresh();
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      const partial = ['RESTORE_PARTIAL', 'RESTORE_AUDIT_FAILED'].includes(error.message);
      setBackupAction({ status: 'error', message: partial ? t.restorePartial : t.backupCreateFailed(error.message) });
      setRestorePreview(null);
      setRestoreConfirmCode('');
      refresh();
    }
  };
  const runGuildAction = async (action, details) => {
    setSettingsAction({ status: 'pending', message: action === 'settings-save' ? t.settingsSaving : t.actionInProgress });
    try {
      const response = await postGuildAction(guild.id, { action, ...details });
      const message = action === 'settings-save'
        ? t.settingsSaved
        : action === 'lockdown-start'
        ? response.summary?.isFullChannelCoverage === false ? t.lockdownStartedPartial : t.lockdownStarted
        : action === 'lockdown-end'
          ? response.summary?.isFullRestoration === false ? t.lockdownEndedPartial : t.lockdownEnded
          : t.settingsActionSucceeded;
      setSettingsAction({ status: response.partial ? 'error' : 'success', message: response.partial && action === 'settings-save' ? t.settingsSavePartial : message });
      refresh();
    } catch (error) {
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      const message = action === 'settings-save'
        ? error.message === 'SETTINGS_SAVE_PARTIAL' ? t.settingsSavePartial
          : error.message === 'SETTINGS_SAVE_AUDIT_FAILED' ? t.settingsSaveAuditFailure
            : error.message === 'SETTINGS_CHANNEL_UNAVAILABLE' ? t.settingsChannelUnavailable
              : error.message === 'SETTINGS_ROLE_UNAVAILABLE' ? t.settingsRoleUnavailable
            : t.settingsSaveFailed(error.message)
        : error.message === 'LOCKDOWN_PARTIAL'
          ? action === 'lockdown-start' ? t.lockdownStartedPartial : t.lockdownEndedPartial
          : error.message === 'SETTINGS_CHANNEL_UNAVAILABLE' ? t.channelOptionsError
          : t.actionFailed(error.message);
      setSettingsAction({ status: 'error', message });
      refresh();
    }
  };

  useEffect(() => {
    if (page !== 'settings' || guild.owner !== true) {
      setChannelOptions([]);
      setRoleOptions([]);
      setChannelsState('idle');
      return undefined;
    }
    let active = true;
    setChannelsState('loading');
    postGuildAction(guild.id, { action: 'settings-options' }).then((response) => {
      if (!active) return;
      if (!Array.isArray(response.channels) || !Array.isArray(response.roles)) throw new Error('INVALID_SETTINGS_OPTIONS');
      setChannelOptions(response.channels);
      setRoleOptions(response.roles);
      setChannelsState('ready');
    }).catch((error) => {
      if (!active) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      setChannelsState('error');
    });
    return () => { active = false; };
  }, [guild.id, guild.owner, onSessionExpired, page, refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    const previousResult = result;
    setState(previousResult ? 'loading-page' : 'loading');
    const request = page === 'settings'
      ? getGuildSettings(guild.id, controller.signal)
      : getGuildBackups(guild.id, { page: backupPage, limit: backupLimit }, controller.signal);

    request.then((data) => {
      setResult(data);
      setState('ready');
    }).catch((error) => {
      if (controller.signal.aborted) return;
      if (['AUTHENTICATION_REQUIRED', 'SESSION_EXPIRED'].includes(error.message) && !handledExpiry.current) {
        handledExpiry.current = true;
        onSessionExpired();
        return;
      }
      if (['ADMIN_REQUIRED', 'GUILD_NOT_AVAILABLE', 'GUILD_ACCESS_DENIED'].includes(error.message)) {
        setResult(null);
        setState('denied');
        return;
      }
      setState(previousResult ? 'page-error' : 'error');
    });
    return () => controller.abort();
  }, [backupLimit, backupPage, guild.id, onSessionExpired, page, refreshToken]);

  const title = page === 'settings' ? t.settings : t.backups;
  const loading = state === 'loading' || state === 'loading-page';

  return (
    <div className={`dashboard-shell${language === 'ar' ? ' rtl' : ''}${mobileMenuOpen ? ' mobile-nav-open' : ''}`}>
      <AppSidebar t={t} guild={guild} user={user} siteAdmin={siteAdmin} selectedPage={page} mobileMenuOpen={mobileMenuOpen} onCloseMobileMenu={() => setMobileMenuOpen(false)} onNavigate={(path) => { setMobileMenuOpen(false); onNavigate(path); }} onSwitchServer={() => { setMobileMenuOpen(false); onSwitchServer(); }} onSignOut={onSignOut} authBusy={authBusy} />
      {mobileMenuOpen && <button type="button" className="mobile-nav-backdrop" aria-label={t.closeMenu} onClick={() => { setMobileMenuOpen(false); document.querySelector('.mobile-menu')?.focus(); }} />}
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" type="button" aria-label={mobileMenuOpen ? t.closeMenu : t.menu} aria-expanded={mobileMenuOpen} aria-controls="dashboard-sidebar" onClick={() => setMobileMenuOpen((open) => !open)}><Menu size={20} /></button>
          <nav className="breadcrumbs" aria-label={t.breadcrumb}><span>{guild.name}</span><span className="breadcrumb-separator">/</span><strong>{title}</strong></nav>
          <div className="topbar-actions live-topbar-actions"><span className="live-user-name">{user?.globalName || user?.username}</span><div className="language-toggle" role="group" aria-label={t.language}><button type="button" aria-pressed={language === 'en'} onClick={() => onLanguageToggle('en')}>EN</button><button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguageToggle('ar')}>عربي</button></div><ThemeToggle language={language} /><button className="live-topbar-signout" type="button" onClick={onSignOut} disabled={authBusy} aria-label={authBusy ? t.signingOut : t.signOut}><LogOut size={15} aria-hidden="true" /></button></div>
        </header>

        <main className="page-content live-read-page">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" />ARGUS WORKSPACE</div><h1>{title}</h1><p>{guild.name} · {page === 'settings' ? t.settingsSubtitle : t.backupsSubtitle}</p></div><div className="heading-actions"><span className="connection-badge"><span className="status-indicator muted" />{page === 'settings' ? t.settingsConfiguration : t.available}</span><button className="refresh-button" type="button" onClick={refresh} disabled={loading} aria-label={t.refreshPage}><RefreshCw size={15} className={loading ? 'spin' : ''} /><span>{t.refreshPage}</span></button></div></div>

          {state === 'loading' && <p className="live-loading-state" role="status">{t.loadingPage(title)}</p>}
          {state === 'loading-page' && <p className="live-stale-state" role="status">{t.refreshingPage}</p>}
          {state === 'error' && <div className="live-error-state" role="alert"><p>{t.pageUnavailable}</p><button className="tracking-reset-button" type="button" onClick={refresh}>{t.retry}</button></div>}
          {state === 'page-error' && <div className="live-stale-state" role="status"><p>{page === 'backups' ? t.backupPageUnavailable : t.staleData}</p><button className="tracking-reset-button" type="button" onClick={refresh}>{t.retry}</button></div>}
          {state === 'denied' && <div className="read-page-empty panel" role="alert"><Shield size={20} aria-hidden="true" /><h2>{page === 'backups' ? t.backupsDeniedTitle : t.readPageDeniedTitle}</h2><p>{page === 'backups' ? t.backupsDeniedDescription : t.readPageDeniedDescription}</p><button className="tracking-reset-button" type="button" onClick={() => onNavigate('/guilds')}>{t.switchServer}</button></div>}

          {result && page === 'settings' && <SettingsContent data={result} language={language} t={t} guild={guild} onSaveSettings={(settings) => runGuildAction('settings-save', { settings })} busy={settingsAction?.status === 'pending'} channelOptions={channelOptions} roleOptions={roleOptions} channelsState={channelsState} onReloadChannels={refresh} />}
          {result && page === 'settings' && <LockdownControls canManageGuild t={t} onAction={runGuildAction} busy={settingsAction?.status === 'pending'} />}
          {page === 'settings' && settingsAction && <p className={`backup-action-feedback ${settingsAction.status === 'error' ? 'error' : settingsAction.status === 'success' ? 'success' : ''}`} role={settingsAction.status === 'error' ? 'alert' : 'status'}>{settingsAction.message}</p>}
          {result && page === 'backups' && <BackupsContent result={result} page={backupPage} limit={backupLimit} onPageChange={(nextPage) => { setBackupPage(nextPage); setRefreshToken((value) => value + 1); }} setLimit={(value) => { setBackupLimit(value); setBackupPage(1); setResult(null); }} state={state} language={language} t={t} onCreateBackup={createBackup} onDeleteBackup={deleteBackupFromDashboard} onRenameBackup={renameBackupFromDashboard} onPreviewRestore={previewBackupRestore} onConfirmRestore={confirmBackupRestore} isGuildOwner={guild.owner === true} backupAction={backupAction} restorePreview={restorePreview} restoreConfirmCode={restoreConfirmCode} setRestoreConfirmCode={setRestoreConfirmCode} />}

          <footer className="page-footer"><span><Shield size={14} aria-hidden="true" />{page === 'backups' ? t.backupsActionsNote : t.settingsFooter}</span><span>ARGUS SECURITY · {new Date().getUTCFullYear()}</span></footer>
        </main>
      </div>
    </div>
  );
}
