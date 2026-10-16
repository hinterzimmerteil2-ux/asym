export const INVERSE_NOTE = 'Aquí la lógica es inversa: lo que te favorece se ve en rojo y lo que te perjudica en verde.';

export const STATUSES = {
  exacerbacion: { label: 'Exacerbación', description: 'Recibes menos curación (20% por nivel). Sube al acertar una habilidad ofensiva.', color: '#e0555f', favorable: true, icon: 'jeringa_rota' },
  pereza: { label: 'Pereza', description: 'Tus cooldowns bajan más rápido.', color: '#e0555f', favorable: true, icon: 'pereza' },
  acetilcolina: { label: 'Acetilcolina', description: 'Velocidad masiva. No gastas ni regeneras Flojera. Los aliados que te pisan ganan velocidad.', color: '#e0555f', favorable: true, icon: 'acetilcolina' },
  fatiga: { label: 'Fatiga', description: 'Vas más lento y la Flojera no se regenera durante 1s tras la Acetilcolina.', color: '#5fd58c', favorable: false, icon: 'fatiga' },
  impulso: { label: 'Impulso', description: 'Un aliado con Acetilcolina te dio un poco de velocidad.', color: '#e0555f', favorable: true, icon: 'impulso' },
  endlag: { label: 'Endlag', description: 'Fallaste una habilidad: quedas inmóvil un momento.', color: '#5fd58c', favorable: false, icon: 'endlag' },
  aturdido: { label: 'Aturdido', description: 'No puedes moverte ni saltar.', color: '#5fd58c', favorable: false, icon: 'aturdido' },
  ralentizado: { label: 'Ralentizado', description: 'Tu velocidad está reducida a la mitad.', color: '#5fd58c', favorable: false, icon: 'ralentizado' },
};
