import React, { useState, useEffect } from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';
import Input from 'components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

export default function AccountSettingsTab() {
  const { user, userProfile, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '' });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ newPass: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    if (userProfile || user) {
      setForm({
        name: userProfile?.full_name || '',
        email: user?.email || '',
        phone: userProfile?.phone || '',
        location: userProfile?.location || '',
      });
      setEmailNotifications(userProfile?.email_notifications !== false);
    }
  }, [userProfile, user]);

  const memberSince = user?.created_at
    ? new Date(user?.created_at)?.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    : 'Recientemente';

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    setSaveError('');
    const { error } = await updateProfile({
      full_name: form?.name,
      phone: form?.phone,
      location: form?.location,
    });
    setSaving(false);
    if (error) {
      setSaveError(error?.message || 'Error al guardar los cambios.');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handlePasswordChange = async (e) => {
    e?.preventDefault();
    setPwError('');
    if (passwords?.newPass !== passwords?.confirm) { setPwError('Las contraseñas no coinciden.'); return; }
    if (passwords?.newPass?.length < 6) { setPwError('La nueva contraseña debe tener al menos 6 caracteres.'); return; }
    const { error } = await supabase?.auth?.updateUser({ password: passwords?.newPass });
    if (error) {
      setPwError(error?.message || 'Error al actualizar la contraseña.');
    } else {
      setPwSuccess(true);
      setChangingPassword(false);
      setPasswords({ newPass: '', confirm: '' });
      setTimeout(() => setPwSuccess(false), 3000);
    }
  };

  const handleNotifToggle = async (val) => {
    setEmailNotifications(val);
    setSavingNotif(true);
    const { error } = await supabase
      ?.from('user_profiles')
      ?.update({ email_notifications: val })
      ?.eq('id', user?.id);
    setSavingNotif(false);
    if (!error) {
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile Section */}
      <div className="bg-card border border-border rounded-md p-4 md:p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
          <Icon name="User" size={18} color="var(--color-primary)" />
          Información Personal
        </h3>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
            {userProfile?.avatar_url ? (
              <Image src={userProfile?.avatar_url} alt={`Avatar de ${form?.name}`} className="w-full h-full object-cover" />
            ) : (
              <Icon name="User" size={28} color="var(--color-muted-foreground)" />
            )}
          </div>
          <div>
            <p className="font-caption font-medium text-foreground">{form?.name || user?.email}</p>
            <p className="text-xs font-caption text-muted-foreground">Miembro desde {memberSince}</p>
          </div>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre completo"
              type="text"
              value={form?.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e?.target?.value }))}
              placeholder="Tu nombre completo"
              required />
            <Input
              label="Correo electrónico"
              type="email"
              value={form?.email}
              disabled
              placeholder="correo@ejemplo.com" />
            <Input
              label="Teléfono"
              type="tel"
              value={form?.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e?.target?.value }))}
              placeholder="+56 9 XXXX XXXX" />
            <Input
              label="Ubicación"
              type="text"
              value={form?.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e?.target?.value }))}
              placeholder="Ciudad, Región" />
          </div>
          {saveError && (
            <p className="text-sm font-caption" style={{ color: 'var(--color-error)' }}>{saveError}</p>
          )}
          <div className="flex items-center gap-3">
            <Button variant="default" type="submit" loading={saving} iconName={saved ? 'Check' : 'Save'} iconPosition="left" iconSize={15}>
              {saved ? '¡Guardado!' : 'Guardar Cambios'}
            </Button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-card border border-border rounded-md p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Icon name="Lock" size={18} color="var(--color-primary)" />
            Seguridad
          </h3>
          {!changingPassword && (
            <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
              Cambiar Contraseña
            </Button>
          )}
        </div>
        {pwSuccess && (
          <p className="text-sm font-caption mb-3" style={{ color: 'var(--color-success)' }}>Contraseña actualizada correctamente.</p>
        )}
        {changingPassword ? (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              label="Nueva contraseña"
              type="password"
              value={passwords?.newPass}
              onChange={(e) => setPasswords((p) => ({ ...p, newPass: e?.target?.value }))}
              placeholder="Mínimo 6 caracteres"
              required />
            <Input
              label="Confirmar nueva contraseña"
              type="password"
              value={passwords?.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e?.target?.value }))}
              placeholder="Repite la nueva contraseña"
              required />
            {pwError && (
              <p className="text-sm font-caption" style={{ color: 'var(--color-error)' }}>{pwError}</p>
            )}
            <div className="flex gap-3">
              <Button variant="default" type="submit" size="sm">Actualizar Contraseña</Button>
              <Button variant="outline" size="sm" onClick={() => { setChangingPassword(false); setPwError(''); }}>Cancelar</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm font-caption text-muted-foreground">
            Usa una contraseña segura para proteger tu cuenta.
          </p>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-card border rounded-md p-4 md:p-6" style={{ borderColor: 'var(--color-error)' }}>
        <h3 className="font-heading font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-error)' }}>
          <Icon name="AlertTriangle" size={18} color="var(--color-error)" />
          Zona de Peligro
        </h3>
        <p className="text-sm font-caption text-muted-foreground mb-4">
          Eliminar tu cuenta borrará permanentemente todos tus avisos, negocios y datos asociados.
        </p>
        <Button variant="destructive" size="sm" iconName="Trash2" iconPosition="left" iconSize={14}>
          Eliminar Cuenta
        </Button>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card border border-border rounded-md p-4 md:p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
          <Icon name="Bell" size={18} color="var(--color-primary)" />
          Notificaciones
        </h3>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <p className="text-sm font-medium text-foreground">Notificaciones por correo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Recibe un email cuando alguien te envíe un mensaje en un aviso.</p>
          </div>
          <button
            type="button"
            onClick={() => handleNotifToggle(!emailNotifications)}
            disabled={savingNotif}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 ${
              emailNotifications ? 'bg-primary' : 'bg-muted'
            }`}
            style={emailNotifications ? { background: 'var(--color-primary)' } : {}}
            aria-checked={emailNotifications}
            role="switch"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                emailNotifications ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
        {notifSaved && (
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--color-success, #16a34a)' }}>
            <Icon name="Check" size={13} color="currentColor" />
            Preferencia guardada
          </p>
        )}
      </div>
    </div>
  );
}
