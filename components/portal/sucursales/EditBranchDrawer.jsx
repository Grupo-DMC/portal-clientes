'use client';
import { useEffect, useState } from 'react';
import { Drawer, FieldError } from '@/components/portal/ui';
import { useToast } from '@/components/portal/ui/Toast';
import { ZONAS } from '@/lib/pcliente/constants';
import { sucKey } from '@/lib/pcliente/helpers';
import { usePortal } from '@/lib/pcliente/store';
import { intOrNull, optionalIntValid } from '@/lib/pcliente/validation';

/** Editar nombre, zona, mall, número de local, accesos y equipos de una sucursal. */
export default function EditBranchDrawer({ sucursal: s, open, onClose, onSaved }) {
  const { sucursales, usuarios, actions } = usePortal();
  const toast = useToast();
  const [f, setF] = useState(null);
  const [err, setErr] = useState({});

  useEffect(() => {
    if (open) {
      setF({ nombre: s.nombre, zona: s.zona || '', mall: s.mall || '', local: s.local ?? '', accesos: s.accesos ?? '', equipos: s.equipos ?? '' });
      setErr({});
    }
  }, [open, s]);

  if (!open || !f) return null;
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErr({ ...err, [k]: '' }); };
  const jefes = usuarios.filter((u) => u.rol === 'zona' && u.zona === f.zona).map((u) => u.nombre);
  const zonaHint = !f.zona ? 'Sin zona, ningún jefe de zona verá este local.'
    : jefes.length ? `Jefe de zona: ${jefes.join(', ')}. Al guardar, verá este local.` : 'Esta zona todavía no tiene jefe asignado.';

  const save = () => {
    const nombre = f.nombre.trim();
    const e = {
      nombre: nombre.length < 3 ? 'Escribe el nombre del local.' : sucursales.some((x) => x !== s && x.nombre === nombre) ? 'Ya hay otro local con ese nombre.' : '',
      local: optionalIntValid(f.local) ? '' : 'Usa solo números, por ejemplo 121.',
      accesos: optionalIntValid(f.accesos) ? '' : 'Usa solo números.',
      equipos: optionalIntValid(f.equipos) ? '' : 'Usa solo números.'
    };
    setErr(e);
    if (Object.values(e).some(Boolean)) return;
    actions.updateSucursal(sucKey(s), {
      nombre, zona: f.zona || null, mall: f.mall.trim() || null,
      local: intOrNull(f.local), accesos: intOrNull(f.accesos), equipos: intOrNull(f.equipos)
    });
    onClose();
    onSaved?.(nombre);
    toast('Cambios del local guardados.');
  };

  return (
    <Drawer open={open} title={`Editar ${s.nombre}`} labelId="leTitle" onClose={onClose} onSubmit={save}
      footer={<><button className="btn-out" type="button" onClick={onClose}>Cancelar</button><button className="btn-pri" type="submit">Guardar cambios</button></>}>
      <div className="form-row">
        <label htmlFor="leNombre">Nombre del local</label>
        <input className="input" id="leNombre" value={f.nombre} onChange={set('nombre')} aria-invalid={!!err.nombre} />
        <FieldError>{err.nombre}</FieldError>
      </div>
      <div className="form-row">
        <label htmlFor="leZona">Zona a la que pertenece</label>
        <select className="input" id="leZona" value={f.zona} onChange={set('zona')}>
          <option value="">Sin zona</option>
          {ZONAS.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
        </select>
        <p className="muted">{zonaHint}</p>
      </div>
      <div className="form-row">
        <label htmlFor="leMall">Mall o dirección</label>
        <input className="input" id="leMall" value={f.mall} onChange={set('mall')} placeholder="Ej.: Mall Plaza Oeste" />
      </div>
      <div className="le-3">
        {[['local', 'N.º de local'], ['accesos', 'Accesos'], ['equipos', 'Equipos']].map(([k, label]) => (
          <div className="form-row" key={k}>
            <label htmlFor={`le-${k}`}>{label}</label>
            <input className="input" id={`le-${k}`} inputMode="numeric" value={f[k]} onChange={set(k)} aria-invalid={!!err[k]} />
            <FieldError>{err[k]}</FieldError>
          </div>
        ))}
      </div>
      <p className="muted">Marca, comuna y estado los mantiene Grupo DMC. Si alguno está mal, avísale a tu ejecutivo.</p>
    </Drawer>
  );
}
