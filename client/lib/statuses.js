export const INVERSE_NOTE = 'Aquí la lógica es inversa: lo que te favorece se ve en rojo y lo que te perjudica en verde.';

export const STATUSES = {
  exacerbacion: { label: 'Exacerbación', description: 'Recibes menos curación (20% por nivel). Sube al acertar una habilidad ofensiva.', color: '#e0555f', favorable: true, icon: 'jeringa_rota', dynamic: true },
  pereza: { label: 'Pereza', description: 'Tus cooldowns bajan más rápido.', color: '#e0555f', favorable: true, icon: 'pereza', dynamic: true },
  acetilcolina: { label: 'Acetilcolina', description: 'Velocidad masiva aunque te quedes sin Flojera. Correr gasta Flojera y no se regenera. Los aliados que te pisan ganan velocidad.', color: '#e0555f', favorable: true, icon: 'acetilcolina', dynamic: false },
  fatiga: { label: 'Fatiga', description: 'Vas más lento y la Flojera no se regenera durante 1s tras la Acetilcolina.', color: '#5fd58c', favorable: false, icon: 'fatiga', dynamic: false },
  impulso: { label: 'Impulso', description: 'Aliados con Acetilcolina te dan velocidad (+25% por nivel, uno por aliado cercano).', color: '#e0555f', favorable: true, icon: 'impulso', dynamic: true },
  ayuno: { label: 'Ayuno', description: 'Tu Flojera no se regenera.', color: '#5fd58c', favorable: false, icon: 'fatiga', dynamic: false },
  endlag: { label: 'Endlag', description: 'Fallaste una habilidad: quedas inmóvil. Dura menos con más Flojera; pulsa C para cancelarlo por 30 de Flojera.', color: '#5fd58c', favorable: false, icon: 'endlag', dynamic: false },
  aturdido: { label: 'Aturdido', description: 'No puedes moverte ni saltar.', color: '#5fd58c', favorable: false, icon: 'aturdido', dynamic: false },
  ralentizado: { label: 'Ralentizado', description: 'Tu velocidad baja según el nivel (50%, 65%, 75%).', color: '#5fd58c', favorable: false, icon: 'ralentizado', dynamic: true },
};
