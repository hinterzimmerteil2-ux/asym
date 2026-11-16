# Prompt: completar PIE de Réplica en una sola pasada

Eres un traductor al protoindoeuropeo (PIE) reconstruido, estilo del resto del juego. Traduce TODAS las filas de la tabla de abajo, sin saltarte ninguna y sin pedirme confirmación.

## Reglas
- Entrada: `N | español | inglés | actual`. `actual` es un borrador en inglés en mayúsculas o a medias: reemplázalo por PIE de verdad.
- Salida: SOLO líneas con este formato, una por fila, en orden, sin comentarios en el código:
  `  N: 'texto en PIE',`
  Escapa las comillas simples como `\'`.
- Ortografía: laringales h₁ h₂ h₃, palatovelares ḱ ǵ ǵʰ, labiovelares kʷ gʷ gʷʰ, aspiradas bʰ dʰ gʰ, sonantes silábicas r̥ l̥ m̥ n̥, semivocales u̯ i̯, vocales largas ē ō ā, acento agudo. Coherente con las filas ya traducidas de `client/lib/i18n_pie.js` (por ejemplo solh₂weh₁yetōr = Curador, ǵʰóstis = Paciente, gʷíh₃u̯eti = vive).
- Conserva tal cual: números, unidades (s, HP, m), teclas (Q, E, R, F, 1 a 5), símbolos (✓ ← → ×), comillas, signos de puntuación y la estructura de la frase. Si el español termina en `:` o `(`, el PIE también.
- Nombres propios, memes y marcas (Jeffrey, goyslop, chicharrón, Minceraft, Platinum Star, SUNAT, Town Level Verse, Rímac, Kali): déjalos como están o adáptalos con terminación PIE solo si ya existe en la tabla. No inventes parecidos a personajes con derechos.
- Términos del juego, usa siempre lo mismo: Flojera = recurso de energía (usa `lēu̯os` o lo que ya aparezca en las filas existentes), Curador, Paciente, aturdir/aturdimiento, empujón, ralentizar, invisible, módulo, carta, súper-habilidad.
- No uses "—", "·" ni "–". Usa coma, punto o dos puntos.
- Textos largos: traduce la frase completa, sin resumir. Si una palabra moderna no tiene raíz, usa una perífrasis PIE.
- Puedes dejar una fila igual solo si es un nombre propio, un código o un símbolo.

## Tras traducir
1. Pega las líneas en `client/lib/i18n_pie.js` reemplazando las del mismo número.
2. Revisa que no haya números repetidos y que el archivo siga cargando.
3. `npm run build` en `client`, commit y push.

## Tabla (385 filas)

0 | Ocurrió un error al iniciar sesión. | An error occurred while signing in. | LOGIN ERROR.
2 | Volver e intentar de nuevo | Go back and try again | apo-wérteti; ereueti
9 | Elegí una herramienta, click en el lienzo para colocar, arrastrá para mover, click derecho o el botón × para borrar. | Pick a tool, click the canvas to place, drag to move, right-click or the × button to delete. | SELECT TOOL, CLICK CANVAS TO PLACE, DRAG TO MOVE, RIGHT CLICK OR BUTTON × TO DELETE.
10 | Objeto de auto-daño | Self-damage object | bhlīg̑-tis swós
12 | Rampa | Ramp | upo-péntom
17 | Objetos de auto-daño: | Self-damage objects: | SELF-DAMAGE OBJECTS:
18 | Objetos de colisión: | Collision objects: | COLLISION OBJECTS:
19 | en conflicto (marcados en amarillo), muy cerca del centro, del anillo de spawn de Pacientes, o de otro objeto. | in conflict (marked in yellow), too close to the centre, to the Patient spawn ring, or to another object. | IN CONFLICT (MARKED YELLOW), TOO CLOSE TO CENTER, PATIENT SPAWN RING, OR ANOTHER OBJECT.
20 | Radio de colisión | Collision radius | COLLISION RADIUS
22 | ej. quirofano_2 | e.g. operating_theatre_2 | E.G. quirofano_2
24 | ej. Quirófano 2 | e.g. Operating Theatre 2 | E.G. QUIRÓFANO 2
27 | ✓ Guardado. Ya se puede elegir " | ✓ Saved. You can now pick " | ✓ SAVED. NOW SELECTABLE "
28 | " desde el lobby. | " from the lobby. | " FROM LOBBY.
31 | ← Volver al lobby | ← Back to the lobby | ← LOBBY
33 | Vista 3D: arrastra para girar, rueda para acercar y haz clic en el suelo para colocar la herramienta elegida. | 3D view: drag to rotate, scroll to zoom and click the floor to place the chosen tool. | 3D VIEW: DRAG TO ROTATE, WHEEL TO ZOOM, CLICK FLOOR TO PLACE SELECTED TOOL.
34 | El lienzo representa el área de partida completa (MATCH_AREA). Las posiciones se guardan como fracción del centro, no en unidades fijas, el mismo layout funciona igual si el área real es más chica o más grande. | The canvas represents the whole match area (MATCH_AREA). Positions are saved as a fraction of the centre, not in fixed units, the same layout works if the real area is smaller or larger. | CANVAS REPRESENTS FULL MATCH_AREA. POSITIONS ARE SAVED AS FRACTIONS FROM CENTER, NOT FIXED UNITS; SAME LAYOUT WORKS IF THE REAL AREA IS SMALLER OR LARGER.
35 | Layout exportado | Exported layout | LAYOUT EXPORTED
36 | Copiá este bloque y pegalo como una nueva entrada en | Copy this block and paste it as a new entry in | COPY THIS BLOCK AND PASTE IT AS A NEW ENTRY IN
37 | dentro de | inside | en
38 | . Esto NO se aplica automáticamente al juego, es un layout generado, listo para copiar a mano. | . This is NOT applied to the game automatically, it is a generated layout, ready to copy by hand. | . THIS DOES NOT APPLY AUTOMATICALLY TO THE GAME; IT IS A GENERATED LAYOUT, READY TO COPY MANUALLY.
43 | Camilla Magnética | Magnetic Stretcher | Camilla Magnética
48 | Réplica | Replica | dwi-tom
51 | Te hiciste daño (HP: | You hurt yourself (HP: | SELF-DAMAGE (HP:
53 | Paciente(s) afectado(s) | Patient(s) affected | AFFECTED PATIENT(S)
54 | Usaste: | You used: | néudeti:
57 | Sala: | Room: | dómos:
60 | (tú) | (you) | (tu)
61 | Hacer Curador a este jugador | Make this player the Healer | SET ROLE: HEALER
63 | Elegí tu personaje | Choose your character | amé CHARACTER
66 | (personalizado) | (custom) | (CUSTOM)
67 | Crear mapa nuevo → | Create new map → | néwos MAP →
71 | Hace falta al menos 1 Curador y 1 Paciente para empezar | At least 1 Healer and 1 Patient are needed to start | NEED AT LEAST 1 HEALER AND 1 PATIENT TO START
72 | Hace falta al menos 1 Curador y 1 Paciente | At least 1 Healer and 1 Patient are needed | NEED AT LEAST 1 HEALER AND 1 PATIENT
74 | (falta 1 jugador) | (1 more player needed) | (1 PLAYER MISSING)
78 | (¡cerca de ganar!) | (close to winning!) | (NEAR VICTORY!)
79 | (¡cerca de ser curado del todo!) | (close to being fully healed!) | (NEAR FULL HEAL!)
81 | - pierde en 0 o en | - loses at 0 or at | - LOSES AT 0 OR AT
86 | (¡exhausto, no puedes correr!) | (exhausted, you cannot run!) | (EXHAUSTED, CANNOT RUN!)
89 | - elige primero el anterior | - choose the previous one first | amé PREVIOUS FIRST
90 | - elige ( | - choose ( | - amé (
96 | Tú | You | tu
100 | Ayuda | Help | aleq-tis
101 | Hitboxes y ping (B) | Hitboxes and ping (B) | HITBOXES AND PING (B)
102 | Shiftlock (Ctrl) | Shiftlock (Ctrl) | Shiftlock (Ctrl)
105 | Anterior | Previous | pró
109 | Espectando: | Spectating: | wéydeti:
114 | Aparecer | Appear | k̑réieti
115 | Gira el teléfono para jugar mejor | Rotate your phone to play | ROTATE PHONE TO PLAY BETTER
116 | No se puede guardar el juego como marcador ni como archivo desde aquí. | The game cannot be saved as a bookmark or as a file from here. | THE GAME CANNOT BE SAVED AS A BOOKMARK OR FILE FROM HERE.
119 | Reconectando con el servidor... | Reconnecting to the server... | RECONNECTING TO SERVER...
120 | Desgracias (hipercomplejos) | Misfortunes (hypercomplex) | DESGRACIAS (HYPERCOMPLEX NUMBERS)
121 | Desgracias: se miden en hipercomplejos (ℍ, cuaterniones) | Misfortunes: measured in hypercomplex numbers (ℍ, quaternions) | DESGRACIAS: MEASURED IN HYPERCOMPLEX NUMBERS (ℍ, QUATERNIONS)
124 | Color | Colour | peik-tom
133 | La salud del Curador llegó a 0 | The Healer's health reached 0 | HEALER HP REACHED 0
134 | El Curador se curó hasta el máximo | The Healer reached maximum health | HEALER HEALED TO MAXIMUM
135 | Todos los Pacientes fueron resueltos | All Patients were resolved | ALL PATIENTS RESOLVED
140 | Volver al lobby | Back to the lobby | LOBBY
141 | Esperando a que el host vuelva al lobby... | Waiting for the host to return to the lobby... | WAITING FOR HOST TO RETURN TO LOBBY...
144 | Continuar con Google | Continue with Google | CONTINUE WITH Google
145 | Continuar con Discord | Continue with Discord | CONTINUE WITH Discord
160 | En sala | In a room | en dómos
162 | Sala | Room | dómos
164 | Espacio | Space | préwe
165 | Paso normal (mantener), sin gastar Flojera | Normal pace (hold), uses no Laziness | NORMAL WALK (HOLD), WITHOUT SPENDING FLOJERA
166 | Curar (Curador) / auto-dañarte en objeto rojo (Paciente) | Heal (Healer) / hurt yourself on a red object (Patient) | HEAL (HEALER) / SELF-DAMAGE ON RED OBJECT (PATIENT)
169 | Acertar el ritmo de Grito de Ánimo | Hit the beat of Cheer Shout | MATCH THE RHYTHM OF Grito de Ánimo
173 | Shiftlock: el personaje mira hacia donde apunta la cámara | Shiftlock: the character faces where the camera points | Shiftlock: CHARACTER FACES CAMERA AIM
175 | Controles | Controls | tag-trom
179 | Grito de Ánimo, pulsa [E] al ritmo - | Cheer Shout, press [E] to the beat - | Grito de Ánimo, PRESS [E] IN RHYTHM -
184 | Usar | Use | néudeti
185 | Cabeza | Head | káput
187 | Espalda | Back | órsos
188 | Gorro de lana | Woolly hat | mel-kadh-tom
190 | Sombrero de copa | Top hat | CYLINDRUS
191 | Casco de obra | Hard hat | káput-kadh-trom
197 | Tirantes | Braces | SUSPENSORIA
199 | Capa | Cape | wés-tom
200 | Alas | Wings | PTERA
201 | Megáfono | Megaphone | MEGAPHONUM
202 | Mete-Mano | Fisticuffs | Mete-Mano
203 | Ofensiva: pa' que el otro se acuerde de ti. | Offensive: so they won't forget you. | OFFENSIVE: SO THE OTHER PLAYER REMEMBERS YOU.
204 | Aguantón | Stalwart | Aguantón
205 | Defensiva: tú no pasas, ni tu abuela. | Defensive: you shall not pass, and neither shall your gran. | DEFENSIVE: YOU DO NOT PASS, NOT EVEN YOUR GRANDMOTHER.
206 | Con Ñapa | With a Bonus | Con Ñapa
207 | Bonificadora: te regalan algo extra. | Boosting: you get a little something extra. | BONUS: YOU RECEIVE SOMETHING EXTRA.
208 | Chao Pescao | Ta-ra, Mate | Chao Pescao
209 | Escapista: lo tuyo es no estar ahí. | Escapist: you're all about not being there. | ESCAPIST: YOUR THING IS NOT BEING THERE.
210 | No se pudo crear la sesión de invitado. | Could not create the guest session. | GUEST SESSION CREATION FAILED.
211 | No se pudo actualizar el nombre. | Could not update the name. | NAME UPDATE FAILED.
212 | Aquí la lógica es inversa: lo que te favorece se ve en rojo y lo que te perjudica en verde. | The logic is reversed here: what helps you shows in red and what hurts you in green. | THE LOGIC IS INVERTED: WHAT BENEFITS YOU APPEARS RED, WHAT HARMS YOU APPEARS GREEN.
214 | Recibes menos curación (20% por nivel). Sube al acertar una habilidad ofensiva. | You receive less healing (20% per level). Rises when you land an offensive skill. | YOU RECEIVE LESS HEALING (20% PER LEVEL). IT INCREASES WHEN AN OFFENSIVE SKILL HITS.
215 | Pereza | Sloth | swépnos
216 | Tus cooldowns bajan más rápido. | Your cooldowns drop faster. | YOUR COOLDOWNS DECREASE FASTER.
217 | Velocidad masiva aunque te quedes sin Flojera. Correr gasta Flojera y no se regenera. Los aliados que te pisan ganan velocidad. | Huge speed boost even if you run out of Laziness. Running drains Laziness, which does not regenerate. Allies who run over you gain speed. | MASSIVE SPEED EVEN WHEN YOU RUN OUT OF FLOJERA. RUNNING SPENDS FLOJERA AND IT DOES NOT REGENERATE. ALLIES WHO STEP ON YOU GAIN SPEED.
218 | Fatiga | Fatigue | k̑em-tis
219 | Vas más lento y la Flojera no se regenera durante 1s tras la Acetilcolina. | You are slower and Laziness does not regenerate for 1s after Acetylcholine. | YOU MOVE SLOWER AND FLOJERA DOES NOT REGENERATE FOR 1s AFTER ACETILCOLINA.
221 | Aliados con Acetilcolina te dan velocidad (+25% por nivel, uno por aliado cercano). | Allies with Acetylcholine give you speed (+25% per level, one per nearby ally). | ALLIES WITH ACETILCOLINA GIVE YOU SPEED (+25% PER LEVEL, ONE PER NEARBY ALLY).
223 | Quieto: regeneras Flojera al doble. | Stand still to regenerate Laziness twice as fast. | STILL: FLOJERA REGENERATES TWICE AS FAST.
226 | Penalización por una acción mal hecha. | Penalty for a botched action. | PENALTY FOR AN INCORRECT ACTION.
229 | Aturdido. | Stunned. | bhlīg̑-tós.
232 | Botellazo | Bottle Strike | BOTTLE HIT
233 | Acetilcolina | Acetylcholine | ACETILCOLINA
234 | Velocidad masiva por 5s. Correr gasta Flojera y no se regenera; si llegas a 0 el boost sigue hasta que acabe. Los Pacientes que te pasen por encima ganan un poco de velocidad. Al terminar, 1s sin regenerar y luego vas lento un rato. | Huge speed boost for 5s. Running drains Laziness, which does not regenerate; if it hits 0 the boost carries on until it ends. Patients who run over you gain a little speed. Afterwards, Laziness does not regenerate for 1s and you are slowed for a while. | MASSIVE SPEED FOR 5s. RUNNING SPENDS FLOJERA AND IT DOES NOT REGENERATE; IF IT REACHES 0, THE BOOST CONTINUES UNTIL IT ENDS. PATIENTS WHO RUN OVER YOU GAIN A LITTLE SPEED. WHEN IT ENDS, 1s WITHOUT REGENERATION, THEN YOU MOVE SLOWER FOR A WHILE.
235 | Rodar | Roll | wérti
236 | Dash que, si golpea al Curador, lo lanza lejos (ragdoll) y te deja donde estaba él (dropkick); arrastra a tus aliados; sube plataformas de hasta 1.8 de alto. Gasta 25 de Flojera. | A dash that, if it hits the Healer, sends them flying (ragdoll) and leaves you where they stood (dropkick); drags your allies along; climbs platforms up to 1.8 high. Costs 25 Laziness. | DASH: IF IT HITS THE HEALER, IT SENDS THEM FAR AWAY (RAGDOLL) AND MOVES YOU TO THEIR FORMER POSITION (DROPKICK); PULLS ALLIES, CLIMBS PLATFORMS UP TO 1.8 HIGH. COSTS 25 FLOJERA.
238 | Derriba (ragdoll) 3s al Curador dentro de un cubo de 2.5 alrededor tuyo y le quita 25 HP. Tú quedas en endlag 1.2s al usarla. | Knocks the Healer down (ragdoll) for 3s within a 2.5-unit cube around you and deals 25 damage. You suffer 1.2s of endlag after using it. | KNOCKS THE HEALER DOWN (RAGDOLL) FOR 3s INSIDE A 2.5 CUBE AROUND YOU AND REMOVES 25 HP. YOU HAVE 1.2s ENDLAG AFTER USE.
239 | Chicharrón | Chicharrón | Chicharrón
240 | Comes: pierdes 20 de HP, hasta un mínimo de 55. Si ya estás en el mínimo, correr 3s más rápido. | You eat it: lose 20 HP, down to a minimum of 55. If already at the minimum, run faster for 3s. | EAT: LOSE 20 HP, DOWN TO A MINIMUM OF 55. IF ALREADY AT THE MINIMUM, RUN 3s FASTER.
241 | Pierdes 38 de HP, hasta un mínimo de 35 y corres 4s mucho más rápido. Si ya estás en el mínimo, además recuperas 40 de Flojera. Cada uso: HP máximo −30, sin límite. | You lose 38 HP, down to a minimum of 35, and run much faster for 4s. If you are already at the minimum, you also recover 40 Laziness. Each use: maximum HP −30, no limit. | LOSE 38 HP, DOWN TO A MINIMUM OF 35, AND RUN MUCH FASTER FOR 4s. IF ALREADY AT THE MINIMUM, ALSO RECOVER 40 FLOJERA. EACH USE: MAX HP −30, NO LIMIT.
242 | Cáscara de Plátano | Banana Peel | BANANA PEEL
243 | Cáscara de plátano | Banana peel | BANANA PEEL
244 | Lanzas una cáscara 3 de distancia con 2 usos; al lanzarla quedas ralentizado 1.6s. Dura 1 minuto: empieza con 1 de vida y se cura 1 por segundo hasta 61, donde desaparece. Con 31 y 61 de vida pierde un nivel: el Curador que la pisa cae 1, 1.5 o 2s y se cura 8, 14 o 20. Tú también puedes tropezar con ella pasados 2.5s. | Throw a peel 3 units away (2 uses); throwing it slows you for 1.6s. It lasts 1 minute: it starts at 1 life and heals 1 per second up to 61, when it disappears. At 31 and 61 life it drops a level: a Healer who steps on it falls for 1, 1.5 or 2s and heals 8, 14 or 20. You can trip on it too after 2.5s. | THROW A PEEL 3 DISTANCE, 2 USES; AFTER THROWING YOU ARE SLOWED FOR 1.6s. LASTS 1 MINUTE: STARTS WITH 1 HP AND HEALS 1 PER SECOND UP TO 61, THEN DISAPPEARS. AT 31 AND 61 HP IT LOSES A LEVEL: THE HEALER WHO STEPS ON IT FALLS FOR 1, 1.5 OR 2s AND HEALS 8, 14 OR 20. YOU CAN ALSO TRIP ON IT AFTER 2.5s.
245 | Lanzas una cáscara 3 de distancia con 2 usos; al lanzarla quedas ralentizado 0.9s. Dura 1 minuto: empieza con 1 de vida y se cura 1 por segundo hasta 61, donde desaparece. Con 31 y 61 de vida pierde un nivel: el Curador que la pisa cae 1, 1.5 o 2s y se cura 8, 14 o 20. Tú también puedes tropezar con ella pasados 2.5s. | Throw a peel 3 units away (2 uses); throwing it slows you for 0.9s. It lasts 1 minute: it starts at 1 life and heals 1 per second up to 61, when it disappears. At 31 and 61 life it drops a level: a Healer who steps on it falls for 1, 1.5 or 2s and heals 8, 14 or 20. You can trip on it too after 2.5s. | THROW A PEEL 3 DISTANCE, 2 USES; AFTER THROWING YOU ARE SLOWED FOR 0.9s. LASTS 1 MINUTE: STARTS WITH 1 HP AND HEALS 1 PER SECOND UP TO 61, THEN DISAPPEARS. AT 31 AND 61 HP IT LOSES A LEVEL: THE HEALER WHO STEPS ON IT FALLS FOR 1, 1.5 OR 2s AND HEALS 8, 14 OR 20. YOU CAN ALSO TRIP ON IT AFTER 2.5s.
247 | Lanzas la botella: golpe en área pequeña a tu alrededor, a los otros Pacientes (4 de daño y 2/s durante 3s) y ganas +2 de Flojera. Deja un charco pequeño 3s que se debilita en 3 fases: hace hasta 12 de daño en total a cada Paciente. El Curador pierde Flojera y, si tiene menos de la mitad de HP, recibe daño; si tiene más, se cura. Al elegirla (una vez por partida): HP máximo −18, Flojera máxima +8. | Throw the bottle: a small area hit around you strikes the other Patients (4 damage and 2/s for 3s) and you gain +2 Laziness. It leaves a small puddle for 3s that weakens in 3 phases, dealing up to 12 damage in total to each Patient. The Healer loses Laziness and, if below half HP, takes damage; if above, they are healed. When picked (once per match): maximum HP −18, maximum Laziness +8. | THROW THE BOTTLE: SMALL AREA HIT AROUND YOU, AFFECTING OTHER PATIENTS (4 DAMAGE AND 2/s FOR 3s) AND YOU GAIN +2 FLOJERA. LEAVES A SMALL PUDDLE FOR 3s THAT WEAKENS IN 3 PHASES: UP TO 12 TOTAL DAMAGE TO EACH PATIENT. THE HEALER LOSES FLOJERA AND, IF BELOW HALF HP, TAKES DAMAGE; IF ABOVE, IS HEALED. ON SELECTION (ONCE PER MATCH): MAX HP −18, MAX FLOJERA +8.
248 | Mimicry de Kali: tajo rápido al Curador frente a ti (cubo corto desde la mano): −25 HP y aturde 2s; 10% de tajo pesado (−90 HP, aturde 3s). Recuperas 25% del daño como HP. Al elegirla: HP máximo sube a 180. | Kali mimicry: a quick slash at the Healer in front of you (short cube from the hand): −25 HP and stuns for 2s; 10% chance of a heavy slash (−90 HP, stuns for 3s). You recover 25% of the damage as HP. When picked: maximum HP rises to 180. | MIMICRY de Kali: QUICK IN-GAME SLASH AGAINST THE HEALER IN FRONT OF YOU (SHORT HAND CUBE): −25 HP AND 2s STUN; 10% HEAVY HIT (−90 HP, 3s STUN). RECOVER 25% OF DAMAGE AS HP. ON SELECTION: MAX HP RISES TO 180.
249 | Un tajo normal: aturde 1.8s al Curador frente a ti (cubo corto desde la mano). Sin efectos secundarios. | A normal slash: stuns the Healer in front of you for 1.8s (short cube from the hand). No side effects. | NORMAL IN-GAME HIT: STUNS THE HEALER IN FRONT OF YOU FOR 1.8s (SHORT HAND CUBE). NO SECONDARY EFFECTS.
250 | Grito de Ánimo | Cheer Shout | Grito de Ánimo
251 | Minijuego de 8s: te mueves a la mitad y cada acierto (pulsa E al ritmo) da Pereza a los aliados a menos de 8, o a ti si no hay. Los fallos no suman. Pereza se acumula. | An 8s minigame: you move at half speed and each hit (press E to the rhythm) gives Sloth to allies within 8, or to you if there are none. Misses do not count. Sloth stacks. | 8s MINIGAME: YOU MOVE AT HALF SPEED. EACH SUCCESS (PRESS E IN RHYTHM) GIVES PEREZA TO ALLIES WITHIN 8, OR TO YOU IF NONE ARE NEAR. FAILURES ADD NOTHING. PEREZA STACKS.
252 | Vara de hierbas medicinales | Medicinal herb staff | MEDICINAL HERB STAFF
253 | Pulso de Hierbas | Herb Pulse | HERB PULSE
255 | Somnífero de Valeriana | Valerian Sleeping Draught | VALERIAN SEDATIVE
257 | Raíz Atrayente | Attracting Root | ATTRACTING ROOT
258 | Arrastra a los Pacientes hacia ti. | Pulls Patients towards you. | DRAGS PATIENTS TOWARD YOU.
259 | Tónico Reforzado | Fortified Tonic | REINFORCED TONIC
260 | Tus curaciones por click valen el doble por 5s y te curas 20 HP. | Your click heals are worth double for 5s and you heal 20 HP. | YOUR CLICK-HEALS ARE TWICE AS STRONG FOR 5s AND YOU HEAL 20 HP.
261 | Enfermera Buenaventura | Nurse Buenaventura | Enfermera Buenaventura
267 | Arrastra con fuerza a los Pacientes lejanos. | Forcefully pulls in distant Patients. | PULLS DISTANT PATIENTS STRONGLY.
269 | Anula las cartas activas y drena 40 de Flojera. | Cancels active cards and drains 40 Laziness. | NULLIFIES ACTIVE CARDS AND DRAINS 40 FLOJERA.
270 | Instalación médica abandonada | Abandoned medical facility | ABANDONED MEDICAL FACILITY
273 | Solo se puede cambiar el rol antes de iniciar la partida | The role can only be changed before the match starts | ROLE CAN ONLY BE CHANGED BEFORE THE MATCH STARTS
274 | Solo el host puede asignar quién es el Curador | Only the host can assign who is the Healer | ONLY HOST CAN ASSIGN THE HEALER
275 | Ese jugador ya no está en la sala | That player is no longer in the room | THAT PLAYER IS NO LONGER IN THE ROOM
276 | Solo se puede elegir personaje antes de iniciar la partida | A character can only be chosen before the match starts | CHARACTER CAN ONLY BE SELECTED BEFORE THE MATCH STARTS
277 | Solo el Curador elige personaje | Only the Healer chooses a character | ONLY THE HEALER SELECTS THE CHARACTER
278 | Ese personaje no existe | That character does not exist | ne ésti
279 | Solo se puede cambiar el mapa antes de iniciar la partida | The map can only be changed before the match starts | MAP CAN ONLY BE CHANGED BEFORE THE MATCH STARTS
280 | Solo el host puede elegir el mapa | Only the host can choose the map | ONLY HOST CAN SELECT THE MAP
282 | Solo el Curador puede usar habilidades | Only the Healer can use skills | ONLY THE HEALER CAN USE SKILLS
287 | Ese slot no existe | That slot does not exist | ne ésti
288 | Ya elegiste carta para ese slot | You already chose a card for that slot | CARD ALREADY SELECTED FOR THAT SLOT
289 | Esa carta no está entre tus opciones | That card is not among your options | THAT CARD IS NOT AMONG YOUR OPTIONS
290 | Solo los Pacientes pueden usar cartas | Only Patients can use cards | ONLY PATIENTS CAN USE CARDS
291 | Primero elige una carta para ese slot | First choose a card for that slot | SELECT A CARD FOR THAT SLOT FIRST
294 | Ese Paciente no es un objetivo válido | That Patient is not a valid target | THAT PATIENT IS NOT A VALID TARGET
295 | No se pudo validar la posición | Could not validate the position | POSITION VALIDATION FAILED
296 | Estás demasiado lejos para curar a ese Paciente | You are too far away to heal that Patient | TOO FAR AWAY TO HEAL THAT PATIENT
299 | Ese objeto no existe | That object does not exist | ne ésti
300 | Estás demasiado lejos de ese objeto | You are too far from that object | TOO FAR FROM THAT OBJECT
301 | Auto-daño | Self-damage | bhlīg̑-tis swós
306 | Solo el host puede volver al lobby | Only the host can return to the lobby | ONLY HOST CAN RETURN TO LOBBY
307 | Solo el host puede iniciar la partida | Only the host can start the match | ONLY HOST CAN START THE MATCH
308 | Sesión inválida o expirada. Inicia sesión de nuevo. | Invalid or expired session. Sign in again. | INVALID OR EXPIRED SESSION. LOG IN AGAIN.
309 | Solicitud de login inválida o expirada. Intentá de nuevo. | Invalid or expired login request. Try again. | INVALID OR EXPIRED LOGIN REQUEST. TRY AGAIN.
310 | El nombre no puede estar vacío. | The name cannot be empty. | NAME CANNOT BE EMPTY.
311 | El nombre no puede superar los | The name cannot exceed | NAME CANNOT EXCEED
312 | caracteres. | characters. | CHARACTERS.
320 | Espada del UTTVM al | UTTVM's sword at | Espada del UTTVM AT
321 | Tutorial (jugar contra un bot) | Tutorial (play against a bot) | TUTORIAL (PLAY AGAINST A BOT)
326 | Muévete con WASD o el joystick. | Move with WASD or the joystick. | MOVE WITH WASD OR THE JOYSTICK.
327 | Sigue corriendo: la barra de Flojera baja al correr. | Keep running: the Laziness bar drops as you run. | KEEP RUNNING: THE FLOJERA BAR DECREASES WHILE RUNNING.
328 | Mantén Shift (o el botón Lento) para caminar sin gastar Flojera. | Hold Shift (or the Slow button) to walk without spending Laziness. | HOLD Shift (OR SLOW BUTTON) TO WALK WITHOUT SPENDING FLOJERA.
329 | Elige una carta en el menú de cartas de arriba. | Choose a card in the card menu above. | amé ONE CARD IN THE CARD MENU ABOVE.
330 | Usa tu carta con la tecla o botón de su ranura. | Use your card with the key or button of its slot. | USE YOUR CARD WITH THE KEY OR BUTTON OF ITS SLOT.
331 | Acércate a un objeto rojo y haz clic (o pulsa E) para auto-dañarte: así ganas. | Get close to a red object and click (or press E) to hurt yourself: that is how you win. | APPROACH A RED SELF-DAMAGE OBJECT AND CLICK (OR PRESS E) TO TAKE SELF-DAMAGE: THIS IS HOW YOU WIN.
332 | Tutorial completado. Gana cada Paciente que baja su HP a 0; el Curador gana si los cura a todos. Si la partida termina, el host puede volver al lobby. | Tutorial complete. Each Patient wins by bringing their HP down to 0; the Healer wins by healing them all. If the match ends, the host can return to the lobby. | TUTORIAL COMPLETE. EACH PATIENT WINS BY LOWERING THEIR HP TO 0; THE HEALER WINS BY HEALING THEM ALL. WHEN THE MATCH ENDS, THE HOST CAN RETURN TO THE LOBBY.
335 | Revelado | Revealed | k̑rei-tós
341 | Sin rol (elegir cartas libremente) | No role (pick cards freely) | NO ROLE (FREE CARD SELECTION)
342 | Loquito de la Esquina | Street-Corner Nutter | Loquito de la Esquina
343 | Hincha Cantarín del Barrio | Neighbourhood Chanting Fan | Hincha Cantarín del Barrio
344 | Cobrador de Combi | Minibus Conductor | Cobrador de Combi
346 | Gritos y carrera en grupo | Shouts and group sprints | GROUP SHOUTS AND RUNNING
347 | Tajos y escapes | Slashes and escapes | IN-GAME HITS AND ESCAPES
349 | Pulsa [E] / clic en cada marca | Press [E] / click on each mark | PRESS [E] / CLICK EACH MARK
350 | Aguja: pulsa [E] / clic cuando esté en la zona | Needle: press [E] / click when it is in the zone | NEEDLE: PRESS [E] / CLICK WHEN IT IS IN THE ZONE
353 | Apagón | Blackout | ne leuk-tom
354 | ¡Puertas cerradas en | Doors locking in | ¡DOORS CLOSE IN
356 | ¡Puertas abiertas en | Doors opening in | ¡DOORS OPEN IN
358 | ¡Alarma en | Alarm in | ¡ALARM IN
359 | Alarma: se ve a todos los Pacientes | Alarm: every Patient is visible | ALARM: ALL PATIENTS ARE REVEALED
360 | ¡Reubicación de objetos en | Objects relocating in | ¡OBJECTS REPOSITION IN
361 | Objetos reubicados | Objects relocated | wérti
364 | Nuevos | New | néwos
366 | Aún no hay mapas publicados. Crea el primero en el editor. | No maps published yet. Create the first one in the editor. | NO MAPS HAVE BEEN PUBLISHED YET. CREATE THE FIRST IN THE EDITOR.
367 | Solo el host puede elegir el mapa. | Only the host can choose the map. | ONLY HOST CAN SELECT THE MAP.
370 | Mapa de la comunidad: | Community map: | COMMUNITY MAP:
373 | El tiempo pasa a 1:30 | Timer set to 1:30 | TIME → 1:30
374 | Aguja: pulsa | Needle: press | NEEDLE: PRESS
375 | o toca cuando esté en la zona | or tap when it is in the zone | OR TAP WHEN IT IS IN THE ZONE
377 | o toca! | or tap! | wél
379 | o toca en el centro verde | or tap on the green centre | OR TAP GREEN CENTER
381 | Ritmo | Rhythm | RHYTHMUS
382 | o toca dentro de cada marca | or tap inside each mark | OR TAP INSIDE EACH MARK
384 | Adrenalina: velocidad extra (ambos bandos) | Adrenaline: extra speed (both sides) | ADRENALINE: EXTRA SPEED (BOTH SIDES)
385 | Reflejos: recargas más rápidas (ambos bandos) | Reflexes: faster cooldowns (both sides) | REFLEXES: FASTER RECHARGES (BOTH SIDES)
386 | Escudo: las curas y el daño al Curador valen la mitad | Shield: heals and damage to the Healer are worth half | SHIELD: HEALING AND DAMAGE TO THE HEALER ARE HALVED
387 | Codicia: Desgracias x2 (ambos bandos) | Greed: double Misfortunes (both sides) | GREED: DESGRACIAS x2 (BOTH SIDES)
393 | ✓ Publicado. Ya aparece en "Mapas de la comunidad" del lobby. | ✓ Published. It now shows under "Community maps" in the lobby. | ✓ PUBLISHED. NOW APPEARS IN "COMMUNITY MAPS" IN THE LOBBY.
394 | Paraguayizador | Paraguayizador | Paraguayizador
395 | Endlag al empezar y luego 8s invisible: el Curador no te ve y las habilidades de detección no te revelan. Gastas el doble de Flojera y no se regenera. Si el Curador te golpea, se cancela y quedas en endlag más largo. Al terminar, endlag. | Endlag on start, then 8s invisible: the Healer can't see you and detection skills can't reveal you. You spend double Laziness and it doesn't regenerate. If the Healer hits you, it's cancelled and you suffer a longer endlag. Endlag when it ends. | ENDLAG AT START, THEN INVISIBLE FOR 8s: THE HEALER CANNOT SEE YOU AND DETECTION SKILLS DO NOT REVEAL YOU. YOU SPEND DOUBLE FLOJERA AND IT DOES NOT REGENERATE. IF THE HEALER HITS YOU, THE EFFECT IS CANCELLED AND YOU HAVE LONGER ENDLAG. AT THE END, ENDLAG.
396 | Invisible: el Curador no te ve ni te revelan las habilidades de detección. Gastas el doble de Flojera y no se regenera. Si te golpean, se cancela y sufres más endlag. | Invisible: the Healer can't see you and detection skills can't reveal you. You spend double Laziness and it doesn't regenerate. If you're hit, it's cancelled and you suffer more endlag. | INVISIBLE: THE HEALER CANNOT SEE YOU AND DETECTION SKILLS DO NOT REVEAL YOU. YOU SPEND DOUBLE FLOJERA AND IT DOES NOT REGENERATE. IF HIT, THE EFFECT IS CANCELLED AND YOU SUFFER MORE ENDLAG.
398 | Al usarla | On use | ON USE
405 | Revelar | Reveal | k̑réieti
407 | Flojera (+/−) | Laziness (+/−) | swépnos
409 | Paraguayizador (invisible) | Paraguayizador (invisible) | Paraguayizador (INVISIBLE)
414 | Gráficos | Graphics | peik-tis
416 | Mínimo | Minimum | alp-tós
417 | Bajo | Low | upo
420 | Ultra | Ultra | uper
425 | Texturas: no (colores planos) | Textures: off (flat colours) | TEXTURES: NO (FLAT COLORS)
426 | Decoración del hospital: apagada | Hospital decor: off | HOSPITAL DECOR OFF
427 | Decoración del hospital: solo paredes | Hospital decor: walls only | HOSPITAL DECOR: WALLS ONLY
428 | Decoración del hospital: completa (vigas, escombros, polvo) | Hospital decor: full (beams, rubble, dust) | HOSPITAL DECORATION: FULL (BEAMS, DEBRIS, DUST)
434 | 0.1 sacrifica casi todo lo visual para ganar rendimiento. Si tu equipo va lento, baja este valor. | 0.1 sacrifices almost all visuals for performance. If your device is slow, lower this value. | 0.1 SACRIFICES ALMOST ALL VISUAL QUALITY FOR PERFORMANCE. IF YOUR DEVICE IS SLOW, LOWER THIS VALUE.
436 | Controles (haz clic y pulsa la nueva tecla) | Controls (click, then press the new key) | CONTROLS (CLICK AND PRESS THE NEW KEY)
438 | El idioma se cambia con los botones es / en / de de arriba a la derecha. | Change the language with the es / en / de buttons at the top right. | LANGUAGE IS CHANGED WITH THE es / en / de BUTTONS AT THE TOP RIGHT.
439 | Mutación | Mutation | wérti
440 | Sin mutación | No mutation | ne wérti
445 | Calidad automática (baja sola si los FPS caen) | Auto quality (lowers itself if FPS drop) | AUTO QUALITY (LOWERS ITSELF WHEN FPS DROP)
446 | Calidad bajada automáticamente por rendimiento | Quality lowered automatically for performance | QUALITY AUTOMATICALLY LOWERED FOR PERFORMANCE
447 | Pantalla | Screen | wid-trom
448 | Pantalla completa (horizontal) | Fullscreen (landscape) | FULLSCREEN (LANDSCAPE)
449 | Recomendado en móvil: oculta las barras del navegador y fija la pantalla en horizontal. | Recommended on mobile: hides the browser bars and locks the screen to landscape. | RECOMMENDED ON MOBILE: HIDES BROWSER BARS AND LOCKS THE SCREEN IN LANDSCAPE.
451 | Modo de teclas | Key modes | tag-tis
452 | Shiftlock | Shift lock | Shiftlock
454 | Alternar | Toggle | wérteti
457 | Alternar: pulsas para activar y vuelves a pulsar para desactivar. Mantener: activo solo mientras lo pulsas. Mixto: un toque rápido alterna y mantenerlo funciona como pulsar. | Toggle: press to turn on, press again to turn off. Hold: active only while pressed. Mixed: a quick tap toggles and holding works like hold. | TOGGLE: PRESS TO ACTIVATE AND PRESS AGAIN TO DEACTIVATE. HOLD: ACTIVE ONLY WHILE PRESSED. MIXED: A QUICK TAP TOGGLES, HOLDING WORKS AS PRESSING.
458 | Detaining Astral Claw de 30 céntimos | Detaining Astral Claw (30p Edition) | Detaining Astral Claw de 30 céntimos
459 | Empuñas la garra: endlag masivo 5s y se carga hasta 4s (100%). Si te curan, se cancela. Sales saltando o yendo rápido más de 1.2s y queda cargada al % alcanzado. Tras 1.2s puedes volver a usarla: lanzas una esfera amarilla pálida en línea recta hacia donde miras (muy largo alcance, no teledirigida). Si choca con el Curador lo aturde hasta 4s según la carga. Lanzarla también da endlag. | You grip the claw: massive 5s endlag while it charges up to 4s (100%). If you get healed, it cancels. Leave by jumping or moving fast for over 1.2s and it stays charged at the % reached. After 1.2s you can use it again: you throw a pale yellow sphere in a straight line where you look (very long range, not homing). If it hits the Healer it stuns them for up to 4s depending on charge. Throwing it also causes endlag. | EQUIP CLAW: MASSIVE ENDLAG 5s; CHARGES UP TO 4s (100%). HEALING YOU CANCELS THE CHARGE. JUMP OR MOVE FAST FOR MORE THAN 1.2s TO KEEP THE CURRENT CHARGE PERCENTAGE. AFTER 1.2s YOU CAN USE IT AGAIN: RELEASE A PALE YELLOW SPHERE IN A STRAIGHT LINE WHERE YOU ARE FACING (VERY LONG RANGE, NOT HOMING). IF IT COLLIDES WITH THE HEALER, STUNS UP TO 4s ACCORDING TO CHARGE. THROWING IT ALSO CAUSES ENDLAG.
460 | Cargando la garra | Charging the claw | CLAW CHARGING
461 | Garra lista en un momento | Claw ready in a moment | CLAW READY SOON
462 | Garra lista: lánzala | Claw ready: throw it | CLAW READY: RELEASE
463 | Esfera cargada (Astral Claw) | Charged sphere (Astral Claw) | CHARGED SPHERE (Astral Claw)
464 | Invisibilidad (Paraguayizador) | Invisibility (Paraguayizador) | INVISIBILITY (Paraguayizador)
466 | Endlag al empuñarla (s) | Endlag while holding it (s) | ENDLAG ON EQUIP (s)
467 | Espera tras la carga para lanzar (s) | Wait after charging before throwing (s) | WAIT AFTER CHARGE BEFORE RELEASE (s)
468 | Endlag al lanzar (s) | Endlag when throwing (s) | ENDLAG THROW (s)
469 | Velocidad de la esfera | Sphere speed | SPHERE SPEED
470 | Tamaño de la esfera | Sphere size | SPHERE SIZE
471 | Vuelo máximo (s) | Max flight time (s) | MAX FLIGHT (s)
472 | Endlag al empezar (s) | Endlag at start (s) | ENDLAG START (s)
473 | Dura invisible (s) | Invisible for (s) | INVISIBILITY DURATION (s)
474 | Preselección de kit | Kit pre-selection | pro-am-tom KIT
475 | Desactivada: eliges el kit en plena partida. | Off: you pick your kit mid-match. | DISABLED: SELECT THE KIT DURING THE MATCH.
477 | Hospital General (3 pisos, sótano y azotea) | General Hospital (3 floors, basement and roof) | GENERAL HOSPITAL (3 FLOORS, BASEMENT AND ROOFTOP)
480 | Rampa de sótano (bajada) | Basement ramp (down) | FOSSA RAMP ↓
481 | Golpes para romperse (0 = no se rompe) | Hits to break (0 = unbreakable) | HITS TO BREAK (0 = UNBREAKABLE)
482 | Se regenera tras (s, 0 = nunca) | Regenerates after (s, 0 = never) | REGENERATES AFTER (s, 0 = NEVER)
484 | Módulos (auto-daño): | Modules (self-damage): | MODULES (SELF-DAMAGE):
485 | Permitir Módulos juntos o solapados | Allow Modules together or overlapping | ALLOW MODULES TO BE TOGETHER OR OVERLAP
486 | Llevar / pasar Módulo (Paciente) | Carry / hand over Module (Patient) | CARRY / PASS MODULE (PATIENT)
487 | Soltar Módulo (Paciente) | Drop Module (Patient) | DROP MODULE (PATIENT)
489 | Soltar | Drop | pāuséti
492 | Pasos, lanzas clavadas y curas se oyen según la distancia y el piso. A 0% se silencian. | Footsteps, planted spears and cures are heard by distance and floor. At 0% they are muted. | FOOTSTEPS, THROWN OBJECTS STUCK IN PLACE, AND HEALS ARE HEARD ACCORDING TO DISTANCE AND FLOOR. AT 0% THEY ARE SILENCED.
493 | Plantas un círculo de hierbas a tus pies durante 6s. Los Pacientes que estén dentro se curan poco a poco y quedan revelados. | You plant a circle of herbs at your feet for 6s. Patients inside are healed gradually and stay revealed. | PLANT A HERB CIRCLE AT YOUR FEET FOR 6s. PATIENTS INSIDE HEAL GRADUALLY AND BECOME REVEALED.
494 | Lanzas un frasco 6 de distancia. Deja una nube 4.5s que ralentiza; quien respire casi 1s queda dormido 1.5s. | You throw a flask 6 units away. It leaves a cloud for 4.5s that slows; anyone who breathes it for almost 1s falls asleep for 1.5s. | THROW A FLASK 6 DISTANCE. IT LEAVES A CLOUD FOR 4.5s THAT SLOWS; ANYONE WHO BREATHES IT FOR ALMOST 1s FALLS ASLEEP FOR 1.5s.
495 | Una raíz sale en línea recta. El primer Paciente que toque es arrastrado hacia ti y queda atrapado 1s. | A root shoots out in a straight line. The first Patient it touches is dragged towards you and trapped for 1s. | A ROOT MOVES IN A STRAIGHT LINE. THE FIRST PATIENT IT TOUCHES IS PULLED TOWARD YOU AND TRAPPED FOR 1s.
496 | Tus curaciones por click valen el doble por 5s y te curas 20 HP, pero te mueves más lento mientras dure. | Your click cures are worth double for 5s and you heal 20 HP, but you move slower while it lasts. | YOUR CLICK-HEALS ARE TWICE AS STRONG FOR 5s AND YOU HEAL 20 HP, BUT YOU MOVE SLOWER WHILE IT LASTS.
497 | Clavas un gotero a tus pies 8s. Cura de golpe a los Pacientes muy cercanos, y quien pase cerca del gotero queda revelado. | You stick a drip stand in the ground at your feet for 8s. It instantly cures Patients very close by, and anyone who passes near it is revealed. | PLACE A DROPPER AT YOUR FEET FOR 8s. IT INSTANTLY HEALS VERY NEARBY PATIENTS; ANYONE WHO PASSES NEAR IT IS REVEALED.
498 | Disparas un dardo en línea recta. El Paciente que lo reciba se ralentiza y a los 1.8s se desmaya 2s. | You fire a dart in a straight line. The Patient it hits is slowed and faints for 2s after 1.8s. | SEND A DART IN A STRAIGHT LINE. THE PATIENT HIT IS SLOWED AND FAINTS AFTER 1.8s FOR 2s.
499 | Lanzas una camilla que cruza el mapa en línea recta y se lleva consigo a todos los Pacientes que toque. | You launch a gurney that crosses the map in a straight line and carries off every Patient it touches. | THROW A STRETCHER ACROSS THE MAP IN A STRAIGHT LINE; IT CARRIES ALONG ALL PATIENTS IT TOUCHES.
500 | Anula las cartas activas y drena 40 de Flojera. Además, los Módulos cercanos no se pueden usar durante 6s. | Cancels active cards and drains 40 Laziness. Nearby Modules also cannot be used for 6s. | NULLIFIES ACTIVE CARDS AND DRAINS 40 FLOJERA. NEARBY MODULES CANNOT BE USED FOR 6s.
501 | Sostenido por cierta chica caballo | Held by a certain horse girl | HELD BY A CERTAIN HORSE GIRL
502 | Velocidad masiva por 5s. Correr gasta el doble de Flojera y no se regenera; si llegas a 0 el boost sigue hasta que acabe. Los Pacientes que te pasen por encima ganan un poco de velocidad. Al terminar, 1s sin regenerar y luego vas lento un rato. | Massive speed for 5s. Running costs double Laziness and does not regenerate; if you reach 0 the boost lasts until it ends. Patients who run over you gain a little speed. Afterwards, 1s without regenerating and then you are slow for a while. | MASSIVE SPEED FOR 5s. RUNNING SPENDS DOUBLE FLOJERA AND IT DOES NOT REGENERATE; IF IT REACHES 0, THE BOOST CONTINUES UNTIL IT ENDS. PATIENTS WHO RUN OVER YOU GAIN A LITTLE SPEED. WHEN IT ENDS, 1s WITHOUT REGENERATION, THEN YOU MOVE SLOWER FOR A WHILE.
503 | Comes (1.5s quieto, sin que te curen): pierdes 28 de HP, hasta un mínimo de 55, y recuperas algo de Flojera. Si estás a 3 HP o menos del mínimo, no pierdes HP y recuperas Flojera equivalente y corres 3s más rápido. Tu hitbox crece 0.5%. Si te interrumpen, no se consume. | You eat (1.5s standing still, without being healed): you lose 28 HP, down to a minimum of 55, and recover some Laziness. If you are within 3 HP of the minimum, you lose no HP, recover the equivalent in Laziness and run 3s faster. Your hitbox grows 0.5%. If you are interrupted, it is not consumed. | EAT (STILL FOR 1.5s, WITHOUT BEING HEALED): LOSE 28 HP DOWN TO A MINIMUM OF 55 AND RECOVER SOME FLOJERA. IF YOU ARE WITHIN 3 HP OF THE MINIMUM OR LOWER, YOU LOSE NO HP, RECOVER EQUIVALENT FLOJERA, AND RUN 3s FASTER. YOUR HITBOX GROWS 0.5%. IF INTERRUPTED, IT IS NOT CONSUMED.
504 | Comes (1.8s quieto, sin que te curen): pierdes 50 de HP, hasta un mínimo de 35, recuperas algo de Flojera y corres 4s mucho más rápido. Si estás a 3 HP o menos del mínimo, recuperas Flojera equivalente en vez de perder HP. Cada uso: HP máximo −20, sin límite. Si te interrumpen, no se consume. | You eat (1.8s standing still, without being healed): you lose 50 HP, down to a minimum of 35, recover some Laziness and run much faster for 4s. If you are within 3 HP of the minimum, you recover the equivalent in Laziness instead of losing HP. Each use: maximum HP −20, with no limit. If you are interrupted, it is not consumed. | EAT (STILL FOR 1.8s, WITHOUT BEING HEALED): LOSE 50 HP DOWN TO A MINIMUM OF 35, RECOVER SOME FLOJERA, AND RUN MUCH FASTER FOR 4s. IF YOU ARE WITHIN 3 HP OF THE MINIMUM OR LOWER, RECOVER EQUIVALENT FLOJERA INSTEAD OF LOSING HP. EACH USE: MAX HP −20, NO LIMIT. IF INTERRUPTED, IT IS NOT CONSUMED.
505 | Lanzas una cáscara 3 de distancia con 2 usos; al lanzarla quedas ralentizado 1.6s. Dura 1 minuto: empieza con 1 de vida y se cura 1 por segundo hasta 61, donde desaparece. Con 31 y 61 de vida pierde un nivel: el Curador que la pisa cae 1.5, 2.2 o 3s y se cura 8, 14 o 20. Tú también puedes tropezar con ella pasados 2.5s. | You throw a peel 3 units away (2 uses); throwing it slows you for 1.6s. It lasts 1 minute: it starts with 1 life and heals 1 per second up to 61, where it disappears. At 31 and 61 life it loses a level: the Healer who steps on it falls for 1.5, 2.2 or 3s and heals 8, 14 or 20. You can also trip on it after 2.5s. | THROW A PEEL 3 DISTANCE, 2 USES; AFTER THROWING YOU ARE SLOWED FOR 1.6s. LASTS 1 MINUTE: STARTS WITH 1 HP AND HEALS 1 PER SECOND UP TO 61, THEN DISAPPEARS. AT 31 AND 61 HP IT LOSES A LEVEL: THE HEALER WHO STEPS ON IT FALLS FOR 1.5, 2.2 OR 3s AND HEALS 8, 14 OR 20. YOU CAN ALSO TRIP ON IT AFTER 2.5s.
506 | Empuñas la garra: endlag masivo 5s y se carga hasta 5s (100%). Si te curan, se cancela. Sales saltando o yendo rápido más de 1.2s y queda cargada al % alcanzado. Tras 1.2s puedes volver a usarla: lanzas una esfera amarilla pálida en línea recta hacia donde miras (muy largo alcance, no teledirigida). Si choca con el Curador lo aturde hasta 4s según la carga. Lanzarla también da endlag. | You grip the claw: massive endlag for 5s while it charges up to 5s (100%). If you are healed, it is cancelled. You leave by jumping or moving fast for more than 1.2s and it stays charged at the % reached. After 1.2s you can use it again: you throw a pale yellow sphere in a straight line where you look (very long range, not homing). If it hits the Healer it stuns them for up to 4s depending on the charge. Throwing it also gives endlag. | EQUIP CLAW: MASSIVE ENDLAG 5s; CHARGES UP TO 5s (100%). HEALING YOU CANCELS THE CHARGE. JUMP OR MOVE FAST FOR MORE THAN 1.2s TO KEEP THE CURRENT CHARGE PERCENTAGE. AFTER 1.2s YOU CAN USE IT AGAIN: RELEASE A PALE YELLOW SPHERE IN A STRAIGHT LINE WHERE YOU ARE FACING (VERY LONG RANGE, NOT HOMING). IF IT COLLIDES WITH THE HEALER, STUNS UP TO 4s ACCORDING TO CHARGE. THROWING IT ALSO CAUSES ENDLAG.
507 | Gritos, comida y carrera en grupo | Shouts, food and group running | SHOUTS, FOOD AND GROUP RUNNING
508 | Lanzas, garras y trucos raros | Spears, claws and odd tricks | THROWN OBJECTS, CLAWS AND STRANGE TRICKS
510 | Del juego | Of the game | dómos
511 | Esto reemplaza lo que tienes ahora en el editor. ¿Continuar? | This replaces what you currently have in the editor. Continue? | THIS REPLACES WHAT YOU CURRENTLY HAVE IN THE EDITOR. CONTINUE?
512 | No se pudo cargar el mapa. | Could not load the map. | MAP LOAD FAILED.
513 | Coloca al menos un objeto de auto-daño antes de publicar. | Place at least one self-damage object before publishing. | PLACE AT LEAST ONE SELF-DAMAGE OBJECT BEFORE PUBLISHING.
516 | sótano | basement | BASEMENT
517 | Se repite cada (s, 0 = una vez) | Repeats every (s, 0 = once) | REPEATS EVERY (s, 0 = ONCE)
518 | Radio (0 = todo el mapa) | Radius (0 = whole map) | RADIUS: 0 = WHOLE MAP
521 | Toca un bloque del mapa para editarlo (también puedes arrastrarlo). | Tap a block on the map to edit it (you can also drag it). | tagé A MAP BLOCK TO EDIT IT (YOU CAN ALSO DRAG IT).
523 | Cargar un mapa para editarlo | Load a map to edit it | LOAD MAP EDIT
525 | ✓ Cargado como copia: puedes cambiarlo y guardarlo con otro nombre. | ✓ Loaded as a copy: you can change it and save it under another name. | ✓ LOADED AS A COPY: YOU CAN MODIFY IT AND SAVE IT WITH ANOTHER NAME.
526 | Spawn del Curador | Healer spawn | HEALER SPAWN
527 | Spawn de sobrevivientes | Survivor spawn | SURVIVOR SPAWNS
528 | Suero (cura Pacientes, lleva al Curador a la mitad) | Serum (heals Patients, takes the Healer to half) | SERUM (HEALS PATIENTS, BRINGS HEALER TO HALF)
529 | Mueble de bloques | Block furniture | BLOCK FURNITURE
530 | Sótano (foso) | Basement (pit) | BASEMENT (PIT)
531 | Entrepiso (pasable por debajo) | Mezzanine (passable underneath) | MEZZANINE (PASSABLE UNDERNEATH)
532 | Cada mueble son bloques pequeños sueltos: edítalos o bórralos uno a uno con la herramienta Editar. | Each piece of furniture is made of small loose blocks: edit or delete them one by one with the Edit tool. | EACH FURNITURE ITEM IS MADE OF SMALL SEPARATE BLOCKS: EDIT OR DELETE THEM ONE BY ONE WITH THE EDIT TOOL.
533 | Dibujar como escalera (la hitbox sigue siendo rampa) | Draw as stairs (the hitbox stays a ramp) | DRAW AS STAIRS (HITBOX REMAINS A RAMP)
535 | Minijuego por bloque de auto-daño | Minigame per self-damage block | MINIGAME PER SELF-DAMAGE BLOCK
536 | Al azar | Random | k̑aus-tom
538 | Reubicar auto-daño | Relocate self-damage | REPOSITION SELF-DAMAGE OBJECTS
539 | Se cae un bloque o rampa | A block or ramp falls | péteti BLOCK / RAMP
540 | Aparece un bloque o rampa | A block or ramp appears | k̑réieti
542 | Daño | Damage | bhlīg̑-tis
543 | Semilla (vacío: al azar) | Seed (empty: random) | et(e)n-tom
544 | Modo de esta ronda | This round's mode | wértis MODUS
545 | Infección | Infection | INFECTION
548 | Linternas | Flashlights | leuk-trā
554 | Votación de la sala | Room vote | dómos VOTĀTIO
555 | Gana lo más votado. Si hay empate, se elige al azar. | The most voted wins. If it is a tie, one is picked at random. | MOST-VOTED WINS. IF TIED, SELECTED AT RANDOM.
557 | Ordena las tarjetas | Sort the cards | SORT CARDS
558 | con la aguja en la zona | with the needle in the zone | WITH THE NEEDLE IN THE ZONE
560 | en la zona, un fallo reinicia | in the zone, a miss restarts | IN THE ZONE; A MISS RESTARTS
561 | en el centro verde | in the green centre | IN THE GREEN CENTER
562 | dentro de cada marca | inside each mark | INSIDE EACH MARK
564 | Ventana del golpe (ms) | Strike window (ms) | HIT WINDOW (ms)
565 | Tamaño de la caja | Box size | BOX SIZE
566 | Radio del área | Area radius | AREA RADIUS
567 | Aturdimiento al Healer (s) | Stun on the Healer (s) | HEALER STUN (s)
568 | Ralentización (s) | Slow (s) | SLOW DURATION (s)
569 | Nivel de ralentización | Slow level | SLOW LEVEL
570 | Revela al Healer (s) | Reveals the Healer (s) | REVEAL HEALER (s)
571 | Daño al Healer (HP) | Damage to the Healer (HP) | DAMAGE TO HEALER (HP)
572 | Coste de HP | HP cost | HP COST
573 | Te curas (HP) | You heal (HP) | HEAL (HP)
576 | Todavía no hay skills publicadas. | There are no published skills yet. | NO SKILLS PUBLISHED YET.
577 | Teclas (haz clic y pulsa la nueva tecla) | Keys (click and press the new key) | KEYS (CLICK AND PRESS THE NEW KEY)
578 | Acertar el ritmo de Grito de Ánimo y pulsar en los minijuegos de auto-daño | Hit the rhythm of Cheering Shout and press in the self-damage minigames | MATCH THE RHYTHM OF Grito de Ánimo AND PRESS DURING SELF-DAMAGE MINIGAMES
579 | Curar (Curador) / auto-dañarte en un objeto de auto-daño, y pulsar durante el minijuego (Paciente) | Heal (Healer) / hurt yourself on a self-damage object, and press during the minigame (Patient) | HEAL (HEALER) / SELF-DAMAGE ON A SELF-DAMAGE OBJECT, THEN PRESS DURING THE MINIGAME (PATIENT)
580 | El idioma se cambia con los botones es / en / de de arriba a la derecha. | Change the language with the es / en / de buttons at the top right. | LANGUAGE IS CHANGED WITH THE es / en / de BUTTONS AT THE TOP RIGHT.
581 | QUIRÓFANO | OPERATING THEATRE | QUIRÓFANO
582 | RADIOLOGÍA | RADIOLOGY | RADIOLOGÍA
583 | Módulo desinfectado, espera un momento | Module disinfected, wait a moment | MODULE DISINFECTED, WAIT A MOMENT
584 | Atún Medicinal | Medicinal Tuna | Atún Medicinal
585 | Atún Medicinal (Curador) | Medicinal Tuna (Healer) | Atún Medicinal (Curador)
586 | Cura y aturde 1.2s al Paciente frente a ti si se está moviendo. | Heals and stuns the Patient in front of you for 1.2s if they are moving. | HEALS AND STUNS THE PATIENT IN FRONT OF YOU FOR 1.2s IF THEY ARE MOVING.
587 | Fue él | It was him | IT WAS HIM
588 | Costeñas | Coast Lasses | Costeñas
589 | Su majestad | Your majesty | YOUR MAJESTY
590 | Ya pues | Come on | COME ON ALREADY
591 | Ni me mires | Don't look at me | DO NOT EVEN LOOK AT ME
592 | Ni idea | No idea | NO IDEA
593 | Yo me encargo | I've got this | I WILL HANDLE IT
594 | Pulso | Pulse | PULSE
595 | Boss | Boss | pótis
596 | Sin Boss | No Boss | ne pótis
597 | Jeffrey | Jeffrey | Jeffrey
598 | Boss: al azar | Boss: random | BOSS k̑aus-tós
599 | Modelo de Jeffrey: SinisterClock, CC-BY-NC 4.0 | Jeffrey model: SinisterClock, CC-BY-NC 4.0 | MODEL BY Jeffrey: SinisterClock, CC-BY-NC 4.0
603 | Megethoskinesis | Megethoskinesis | Megethoskinesis
604 | Cambio de Canal | Channel Switch | CHANNEL CHANGE
605 | Selector del Vacío | Void Selector | VOID SELECTOR
606 | Agarre de Garra | Claw Grip | CLAW GRIP
607 | Sombra Prestada | Borrowed Shadow | BORROWED SHADOW
608 | Cuadro Temporal Alterado | Altered Time Frame | ALTERED TEMPORAL FRAME
609 | Retrotransmisión | Retransmission | RETROTRANSMISSION
610 | Transmisión en Vivo | Live Broadcast | LIVE TRANSMISSION
611 | Pantalla Roja | Red Screen | RED SCREEN
612 | Pantalla Azul | Blue Screen | BLUE SCREEN
615 | golpe | hit | bhlīg̑-tis
617 | rodeado | surrounded | SURROUNDED
620 | Vuelva mañana | Come back tomorrow | CRĀS REDĪ
621 | Anulación | Annulment | ANNŪLLĀTIO
622 | Hojas | Sheets | peik-tom
625 | Súper 2 (Vuelva mañana) | Super 2 (Come back tomorrow) | SUPER 2 (COME BACK TOMORROW)
626 | Súper 3 (Anulación) | Super 3 (Annulment) | SUPER 3 (ANNULMENT)
631 | Bayoneta | Bayonet | BAYONET
637 | Súper-habilidad. Reemplaza tus dos cartas. Tres modos con 3 hojas: Notificación (cobranza coactiva: marca y revela a un enemigo a 26 unidades o menos durante 6 s; cada habilidad que use suma una deuda y al terminar el plazo sufre un embargo de 1,2 s más 0,5 s por deuda, hasta 3,6 s, sin habilidades y multado; no se puede evitar quedándose quieto), Vuelva mañana (lo rebobina 4,5 s y lo deja en cola 2 s sin habilidades) y Anulación (te rebobinas y limpias estados, con 2 s de lentitud). Pasivas: Ley para ti, no para mí (el notificado sufre estados 1,5 veces más largos y recargas más lentas, y tú sufres menos) y Impuestos (un número complejo: la parte real sube al completar módulos, esquivar ataques y multar, y al llegar a 118 te da una hoja; la parte imaginaria sube al usar modos y da velocidad y resistencia a estados). Teclas 1, 2 y 3. | Super-ability. Replaces both of your cards. Three modes with 3 sheets: Notification (debt collection: marks and reveals an enemy within 26 units for 6 s; every ability they use adds a debt and when the time runs out they suffer an embargo of 1.2 s plus 0.5 s per debt, up to 3.6 s, losing their abilities and getting fined; standing still does not avoid it), Come Back Tomorrow (rewinds them 4.5 s and queues them for 2 s with no abilities) and Annulment (rewind yourself and clear statuses, with 2 s of slowness). Passives: One Law for You, None for Me (the notified enemy suffers statuses 1.5 times longer and slower cooldowns, and you suffer less) and Taxes (a complex number: the real part rises by finishing modules, dodging attacks and fining, and at 118 it gives you a sheet; the imaginary part rises by using modes and grants speed and status resistance). Keys 1, 2 and 3. | SUPER SKILL. REPLACES YOUR TWO CARDS. THREE MODES WITH 3 BLADES: NOTIFICATION (DEBT COLLECTION: MARKS AND REVEALS AN ENEMY AT 26 UNITS OR LESS FOR 6 s; EACH SKILL THEY USE ADDS DEBT AND WHEN TIME ENDS THEY ARE STUNNED FOR 1,2 s PLUS 0,5 s PER DEBT, UP TO 3,6 s, CANNOT USE SKILLS AND ARE FINED; STANDING STILL DOES NOT AVOID IT), COME BACK TOMORROW (REWINDS THEM 4,5 s AND PLACES THEM IN QUEUE FOR 2 s WITHOUT SKILLS), AND ANNULMENT (REWINDS YOU AND CLEARS STATES, WITH 2 s SLOWNESS). PASSIVES: LAW FOR YOU, NOT FOR ME (THE NOTIFIED PLAYER SUFFERS STATES 1,5 TIMES LONGER AND SLOWER RECHARGES, WHILE YOU SUFFER LESS) AND TAXES (A COMPLEX NUMBER: THE REAL PART RISES WHEN COMPLETING MODULES, DODGING ATTACKS AND FINING; AT 118 IT GIVES YOU A BLADE. THE IMAGINARY PART RISES WHEN USING MODES AND GIVES SPEED AND STATE RESISTANCE). KEYS 1, 2 AND 3.
638 | Súper-habilidad. Reemplaza tus dos cartas. Bayoneta (estocada sin retroceso, o disparo de largo alcance con 8 balas: si fallas hay mucho retroceso, si aciertas poco retroceso y más aturdimiento, y ese efecto baja con la distancia; recargas: 2 gratis con Carga cuando no te quedan balas y 1 bala por módulo, hasta 6 por minuto), Barrera (parry: si te golpean en 1,2 s, anula el golpe y contraatacas; si falla, endlag y ganas un poco de escudo) y Señuelo (una copia de tu personaje que corre mientras te vuelves invisible). Pasivas: Demonio del Rin (peluca, 40 % más pequeño y maná que potencia empuje y aturdimiento) y Vuelo (doble salto muy alto por 4 de maná; mantén el salto en el aire para ascender hasta 14 unidades). Teclas 1, 2, 3 y 4. | Super-ability. Replaces both of your cards. Bayonet (a thrust with no recoil, or a long-range shot with 8 bullets: a miss gives heavy recoil, a hit gives little recoil and a longer stun, and that effect fades with distance; reloads: 2 free ones with Charge when you have no bullets, and 1 bullet per module, up to 6 per minute), Barrier (a parry: if you are hit within 1.2 s the blow is cancelled and you counter; if it fails, you get endlag and a little shield) and Decoy (a copy of your character that runs off while you turn invisible). Passives: Rhine Devil (wig, 40% smaller, and mana that boosts knockback and stun) and Flight (very high double jump for 4 mana; hold jump in the air to climb up to 14 units). Keys 1, 2, 3 and 4. | SUPER SKILL. REPLACES YOUR TWO CARDS. BAYONET (IN-GAME WEAPON ABILITY), BARRIER (PARRY: IF HIT WITHIN 1,2 s, NULLIFIES THE HIT AND COUNTERS; IF IT FAILS, ENDLAG AND A LITTLE SHIELD) AND DECOY (A COPY OF YOUR CHARACTER RUNS WHILE YOU BECOME INVISIBLE). PASSIVES: DEMON OF THE RHINE (WIG, 40 % SMALLER, AND MANA THAT BOOSTS PUSH AND STUN) AND FLIGHT (VERY HIGH DOUBLE JUMP FOR 4 MANA; HOLD JUMP IN THE AIR TO RISE UP TO 14 UNITS). KEYS 1, 2, 3 AND 4.
640 | Tu Súper-habilidad ocupa este espacio. | Your super-ability takes up this slot. | YOUR SUPER SKILL OCCUPIES THIS SLOT.
641 | Reemplaza tus 2 cartas | Replaces both cards | REPLACES YOUR 2 CARDS
642 | Reiniciar y volver al lobby | Restart and return to lobby | RESTART LOBBY
645 | Reemplaza tus dos cartas | Replaces both of your cards | dwi peik-tom wérte
647 | (quieto 1 s) | (stand still for 1 s) | (STILL FOR 1 s)
651 | Para todos | For everyone | OMNIBUS
655 | Súper-habilidad. Reemplaza tus dos cartas. Ráfaga (andanada de 1,1 s de golpes rapidísimos al frente, alcance 5, aturde más al final), Stellar Finger (dedo estelar de 20 unidades de alcance, 0,4 s de preparación, preciso y aturdidor), Lanzamiento (tu espíritu embiste 8 unidades en 0,3 s, agarra al primer enemigo y lo lanza por detrás de ti aturdido 1,8 s; si falla, quedas lento 0,5 s) y Pose Fabulosa (posas con todo el drama y deslumbras 1,5 s a todos los enemigos cercanos, cuesta 50 de Gay). Pasivas: Gay (cada golpe sube tu Gay hasta 100 y alarga tus aturdimientos hasta un 60 %) y Contragolpe (si te aturden y tienes 30 de Gay, aturdes 1,1 s a quien tengas a 7 unidades; recarga 8 s). Teclas 1, 2, 3 y 4. | Super-ability. Replaces both of your cards. Barrage (a 1.1 s volley of very fast strikes straight ahead, reach 5, stronger stun at the end), Stellar Finger (a precise, stunning star finger with 20 units of reach and a 0.4 s wind-up), Throw (your spirit charges 8 units in 0.3 s, grabs the first enemy and hurls them behind you, stunned for 1.8 s; on a miss you are slowed for 0.5 s) and Fabulous Pose (you strike a dramatic pose and dazzle every nearby enemy for 1.5 s, costs 50 Gay). Passives: Gay (every hit raises your Gay up to 100 and lengthens your stuns by up to 60%) and Counterstrike (if you are stunned with 30 Gay, you stun whoever is within 7 units for 1.1 s; 8 s cooldown). Keys 1, 2, 3 and 4. | SUPER SKILL. REPLACES YOUR TWO CARDS. BURST (A 1,1 s FLURRY OF VERY FAST IN-GAME HITS FORWARD, RANGE 5, MORE STUN AT THE END), STELLAR FINGER (STELLAR FINGER, RANGE 20 UNITS, 0,4 s PREPARATION, PRECISE AND STUNNING), THROW (YOUR SPIRIT CHARGES 8 UNITS IN 0,3 s, GRABS THE FIRST ENEMY AND HURLS THEM BEHIND YOU, STUNNED FOR 1,8 s; ON A MISS YOU ARE SLOWED FOR 0,5 s) AND FABULOUS POSE (YOU STRIKE A DRAMATIC POSE AND DAZZLE ALL NEARBY ENEMIES FOR 1,5 s, COSTS 50 GAY). PASSIVES: GAY (EACH HIT INCREASES YOUR GAY UP TO 100 AND EXTENDS YOUR STUNS UP TO 60 %) AND COUNTERATTACK (IF STUNNED WITH 30 GAY, STUN A TARGET FOR 1,1 s WITHIN 7 UNITS; RECHARGE 8 s). KEYS 1, 2, 3 AND 4.
656 | Súper-combate | Super-combat | uper-kreutis
659 | Ráfaga | Barrage | BURST
662 | Pose Fabulosa | Fabulous Pose | POSE FABULOSA
663 | Impuestos | Taxes | TRIBUTUM
664 | ◆ Contragolpe | ◆ Counterstrike | CONTRĀ-IMPETUS
665 | Vende tus datos a cierta empresa multimillonaria | Sell your data to a certain multibillion-dollar company | BULLETS
666 | Vende tu alma a la aplicación con moderación de 4chan | Sell your soul to the app with 4chan-grade moderation | RELOADS
667 | Balas | Bullets | 
668 | recargas | reloads | 
669 | Súper-habilidad. Reemplaza tus dos cartas. Construyes con bloques cubo de 1 metro (un poco más de la mitad de un jugador) y un contador de Bloques (48). Eliges la pieza con 1 a 4 (un fantasma verde o rojo sigue el cursor, alcance máximo 7 bloques) y haces clic para colocarla: Andamio (1, como el de Minecraft: se atraviesa, se trepa saltando, agacharte te sostiene y su parte de arriba es piso; apílalo o extiéndelo de lado), Telaraña (1, frena al Curador y al Jefe dentro del cubo), Redstone (2, al activarse en cadena emite un pulso que empuja y aturde 0,6 s; la cadena llega el doble de lejos a través de él) y Slime (2, rebota a quien lo pise). Colocación rápida (0,25 s). Cada pieza dura 20 s, nace casi rota y se va pudriendo: a 1/3 y 2/3 de su vida pierde eficacia. Pasivas: Físicas de Minceraft (saltas 2,5 veces más alto, no recibes daño ni aturdimiento por caída, agacharte en el borde evita que te caigas y Pico, tecla 5: rompes un bloque tuyo en 0,4 s y recuperas su espacio) y Redstone (al activarse una pieza, las vecinas se activan en cadena cada 0,2 s). | Super-ability. Replaces your two cards. You build with 1 meter cube blocks (a bit over half a player) and a Blocks counter (48). Pick the piece with 1 to 4 (a green or red ghost follows the cursor, maximum reach 7 blocks) and click to place it: Scaffold (1, like Minecraft's: you walk through it, climb it by jumping, crouching holds you and its top is a floor; stack it or extend it sideways), Cobweb (1, slows the Healer and the Boss inside the cube), Redstone (2, when chain-activated it emits a pulse that pushes and stuns for 0.6 s; the chain reaches twice as far through it) and Slime (2, bounces whoever steps on it). Fast placement (0.25 s). Each piece lasts 20 s, starts nearly broken and rots away: at 1/3 and 2/3 of its life it loses effectiveness. Passives: Minceraft Physics (you jump 2.5 times higher, take no fall damage or stun, crouching at an edge stops you falling, and Pickaxe, key 5: break one of your own blocks in 0.4 s and get its space back) and Redstone (when a piece activates, its neighbours chain-activate every 0.2 s). | 
670 | Súper-estructuras | Super-structures | 
671 | Andamio | Scaffold | 
672 | Telaraña | Cobweb | 
673 | Redstone | Redstone | 
674 | Pico | Pickaxe | 
675 | Bloques | Blocks | 
676 | Picando | Mining | 
677 | Colocar | Place | 
678 | Clic para colocar | Click to place | 
679 | Elige una pieza (1 a 4) | Choose a piece (1 to 4) | 
