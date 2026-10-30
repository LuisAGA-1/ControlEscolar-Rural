-- =====================================================================
--  003_datos_realistas.sql  ·  Datos de una escuela completa (ciclo 2026-2027)
--  12 grupos (1° a 6°, A y B), 14 docentes nuevos, ~170 alumnos, horario completo,
--  asistencia desde el inicio de clases (31 de agosto) y calificaciones del 1er parcial.
--
--  Seguro de correr en tu base actual: no borra nada, no toca a María, al director
--  ni a Ana/Carlos/Lucía, y se puede correr dos veces sin duplicar (ON CONFLICT DO NOTHING).
--  Todos los docentes nuevos entran con la contraseña: docente123
-- =====================================================================
BEGIN;

-- Generador pseudoaleatorio fijo (mismo resultado en cualquier computadora)
CREATE OR REPLACE FUNCTION pg_temp.azar(t text) RETURNS double precision LANGUAGE sql IMMUTABLE AS
$$ SELECT ('x' || lpad(substr(md5(t), 1, 8), 16, '0'))::bit(64)::bigint / 4294967296.0 $$;

-- 1) Materias del plan de primaria
INSERT INTO materias (escuela_id, nombre)
SELECT '11111111-1111-1111-1111-111111111111', m
  FROM unnest(ARRAY['Español','Matemáticas','Ciencias Naturales','Historia','Geografía',
                    'Formación Cívica y Ética','Artes','Educación Física','Inglés']) AS m
ON CONFLICT DO NOTHING;

-- 2) Docentes (titulares y especialistas)
INSERT INTO usuarios (id, escuela_id, nombre, email, password_hash, rol) VALUES
  ('6f1caa07-1da3-52f4-0b05-74ad519da85c', '11111111-1111-1111-1111-111111111111', 'Rosa Elena Coutiño Ramírez', 'rosa.coutino@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('5babdd5b-396e-4edf-2f7e-0a5f029db080', '11111111-1111-1111-1111-111111111111', 'Adriana Grajales Pérez', 'adriana.grajales@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('2dac7c57-23c6-b2b7-a86c-b5b7b2a02d99', '11111111-1111-1111-1111-111111111111', 'Carmen Nucamendi Toledo', 'carmen.nucamendi@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('85259224-aa35-3efd-251d-1e978cb4818b', '11111111-1111-1111-1111-111111111111', 'Héctor Zenteno Ruiz', 'hector.zenteno@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('68050ae6-1867-4d52-d3d9-1d3efd85a186', '11111111-1111-1111-1111-111111111111', 'Patricia Albores Cruz', 'patricia.albores@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('4c27468c-e388-6d68-b4da-3a9034664f0c', '11111111-1111-1111-1111-111111111111', 'Ricardo Penagos Méndez', 'ricardo.penagos@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('1c56feb6-71a4-0c69-9578-31c8f391b34b', '11111111-1111-1111-1111-111111111111', 'Gabriela Castillejos Díaz', 'gabriela.castillejos@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('2319cbae-7613-6a20-bafb-b027b00dac6e', '11111111-1111-1111-1111-111111111111', 'Fernando Domínguez Robles', 'fernando.dominguez@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('26f9bbb4-e0f4-37c5-385c-e452e8a92491', '11111111-1111-1111-1111-111111111111', 'Laura Velázquez Hidalgo', 'laura.velazquez@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('4aaae00b-101f-cf25-b5d3-561eb1426eca', '11111111-1111-1111-1111-111111111111', 'Arturo Trujillo Gómez', 'arturo.trujillo@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('8348e5e3-b3c4-cc26-75ec-3bb586937249', '11111111-1111-1111-1111-111111111111', 'Silvia Espinosa Nájera', 'silvia.espinosa@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('ca7c12b3-a630-6ffb-768c-f04d35995d8e', '11111111-1111-1111-1111-111111111111', 'Marco Antonio Ozuna Aguilar', 'marco.ozuna@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('ec520563-4cae-7e58-073f-a437b53bd6cf', '11111111-1111-1111-1111-111111111111', 'Daniela Camacho Sántiz', 'daniela.camacho@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente'),
  ('906becc9-501d-ffbd-b2a1-6ec80b530f97', '11111111-1111-1111-1111-111111111111', 'Karen Morales Girón', 'karen.morales@escuela.mx', '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6', 'docente')
ON CONFLICT DO NOTHING;

-- 3) Grupos (si ya existe el grupo se respeta; solo se le pone titular si no tenía)
INSERT INTO grupos (escuela_id, grado, letra, ciclo, docente_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 1, 'A', '2026-2027', (SELECT id FROM usuarios WHERE email = 'rosa.coutino@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 1, 'B', '2026-2027', (SELECT id FROM usuarios WHERE email = 'adriana.grajales@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 2, 'A', '2026-2027', (SELECT id FROM usuarios WHERE email = 'carmen.nucamendi@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 2, 'B', '2026-2027', (SELECT id FROM usuarios WHERE email = 'hector.zenteno@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 3, 'A', '2026-2027', (SELECT id FROM usuarios WHERE email = 'patricia.albores@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 3, 'B', '2026-2027', (SELECT id FROM usuarios WHERE email = 'ricardo.penagos@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 4, 'B', '2026-2027', (SELECT id FROM usuarios WHERE email = 'gabriela.castillejos@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 5, 'A', '2026-2027', (SELECT id FROM usuarios WHERE email = 'fernando.dominguez@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 5, 'B', '2026-2027', (SELECT id FROM usuarios WHERE email = 'laura.velazquez@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 6, 'A', '2026-2027', (SELECT id FROM usuarios WHERE email = 'arturo.trujillo@escuela.mx')),
  ('11111111-1111-1111-1111-111111111111', 6, 'B', '2026-2027', (SELECT id FROM usuarios WHERE email = 'silvia.espinosa@escuela.mx'))
ON CONFLICT DO NOTHING;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'rosa.coutino@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 1 AND letra = 'A' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'adriana.grajales@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 1 AND letra = 'B' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'carmen.nucamendi@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 2 AND letra = 'A' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'hector.zenteno@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 2 AND letra = 'B' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'patricia.albores@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 3 AND letra = 'A' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'ricardo.penagos@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 3 AND letra = 'B' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'gabriela.castillejos@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 4 AND letra = 'B' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'fernando.dominguez@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 5 AND letra = 'A' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'laura.velazquez@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 5 AND letra = 'B' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'arturo.trujillo@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 6 AND letra = 'A' AND ciclo = '2026-2027' AND docente_id IS NULL;
UPDATE grupos SET docente_id = (SELECT id FROM usuarios WHERE email = 'silvia.espinosa@escuela.mx') WHERE escuela_id = '11111111-1111-1111-1111-111111111111' AND grado = 6 AND letra = 'B' AND ciclo = '2026-2027' AND docente_id IS NULL;

-- 4) Alumnos
CREATE TEMP TABLE nuevos_alumnos (id uuid, grado int, letra char(1), curp text, nombre text, tutor text, tel text, perfil text) ON COMMIT DROP;
INSERT INTO nuevos_alumnos VALUES
  ('afc52475-838d-d22a-00c9-f9befd351e2c', 1, 'A', 'NARR191224HCSJZD01', 'Rodrigo Nájera Ruiz', 'Pedro Nájera', '9689236009', 'regular'),
  ('70b12a3d-9063-f8fc-254f-cd75ed236a8d', 1, 'A', 'GOMR191027MCSMNG02', 'Regina Gómez Méndez', 'Valeria Méndez', '9611192750', 'regular'),
  ('22a932df-a200-779a-dd2b-a6fb8433210e', 1, 'A', 'COVR200322MCSTZS03', 'Rosa María Coutiño Vázquez', 'Getsemaní Vázquez', '9617314012', 'bajo'),
  ('bd7b589d-d79a-0fd6-4f6b-0c0e3e8364fb', 1, 'A', 'MEHJ200602HCSNDS04', 'Josué Méndez Hidalgo', 'Esmeralda Hidalgo', '9616184138', 'cumplido'),
  ('890aa107-22a7-9ffd-7ca0-fd9f04a4f0fe', 1, 'A', 'AOTP191017MCSLLL05', 'Paola Albores Toledo', 'Mariana Toledo', '9689362688', 'regular'),
  ('d34b4964-6420-3091-3150-1247edf6c3e2', 1, 'A', 'CADK200526MCSMMR06', 'Karla Camacho Domínguez', 'Abigail Domínguez', '9689039473', 'cumplido'),
  ('afe5f2ec-82b2-3624-1d92-fb2bb3c69a27', 1, 'A', 'CUPL200826HCSRRN07', 'Leonardo Cruz Pérez', 'Rosa Pérez', '9618204296', 'cumplido'),
  ('fbdce7b4-a4ac-21b2-f6f6-f72e7989ee08', 1, 'A', 'MAVA200717MCSRLN08', 'Ana Karen Martínez Velázquez', 'Mario Martínez', '9685211189', 'regular'),
  ('9918a19a-1ed2-5257-b81d-cb3d048d244b', 1, 'A', 'NAON200324MCSJZT09', 'Natalia Nájera Ozuna', 'Itzel Ozuna', '9611155640', 'cumplido'),
  ('9a9791fa-24b1-cb43-998b-a427c03b4b91', 1, 'A', 'TUCL200303MCSRMS10', 'Leslie Trujillo Camacho', 'Daniel Trujillo', '9689146498', 'cumplido'),
  ('eb1c700c-131e-7273-eee2-6c5ecdebb211', 1, 'A', 'TOHL200805MCSLDS11', 'Leslie Toledo Hidalgo', 'Gael Toledo', '9618678186', 'irregular'),
  ('5d8a1c90-1ee4-2862-bfd4-210adc4ecfce', 1, 'A', 'NARJ200419HCSJML12', 'Joel Nájera Ramírez', 'Kevin Nájera', '9619038740', 'irregular'),
  ('5a7edb36-08ee-ee8a-4641-f29bf27f5b68', 1, 'A', 'CAPA191020MCSMNN13', 'Ana Karen Camacho Penagos', 'Marisol Penagos', '9613455491', 'cumplido'),
  ('cfe648e3-3bd6-f890-a486-183258363434', 1, 'A', 'GORS200624HCSMBN14', 'Santiago Gómez Robles', 'Yuliana Robles', '9614335171', 'cumplido'),
  ('51304b8b-ad8c-0dcf-6081-69a90ad2ce9a', 1, 'A', 'GAJS190903HCSRMB15', 'Sebastián Grajales Jiménez', 'Mariana Jiménez', '9689254204', 'regular'),
  ('8cba87f5-1d6d-17e0-44d7-857b82c5eaa8', 1, 'B', 'OUCL200703HCSZRN16', 'Leonardo Ozuna Cruz', 'Gael Ozuna', '9618009167', 'regular'),
  ('308af89b-4334-f426-356e-f5cc1fabac27', 1, 'B', 'NACO200318HCSJSS17', 'Óscar Nájera Castillejos', 'Brayan Nájera', '9611237093', 'bajo'),
  ('e2bbb070-946a-1356-9c6c-78bc58be923d', 1, 'B', 'DIPA200225MCSZRN18', 'Ana Karen Díaz Pérez', 'Getsemaní Pérez', '9611429199', 'cumplido'),
  ('3fb0bfad-3a27-c7d4-175e-d743dbd8a9b9', 1, 'B', 'NURR200214MCSCBS19', 'Rosa María Nucamendi Robles', 'Erick Nucamendi', '9613864434', 'cumplido'),
  ('52d51908-0615-98eb-2c47-53a56ddfd16e', 1, 'B', 'ZEAF200703HCSNLR20', 'Francisco Zenteno Albores', 'Elena Albores', '9617696744', 'cumplido'),
  ('a6524a71-2187-ef59-01e5-fe2bfc5d3aef', 1, 'B', 'EIPL200419HCSSRS21', 'Luis Ángel Espinosa Pérez', 'Brayan Espinosa', '9611343426', 'cumplido'),
  ('3d0f8d6f-9f4c-b4ca-14ee-c93a2e9a8ace', 1, 'B', 'GUMA200318HCSTRN22', 'Ángel Gutiérrez Moreno', 'Natalia Moreno', '9612319675', 'cumplido'),
  ('a6a57c2f-873f-f839-3413-cdb37edb81c3', 1, 'B', 'MORE200425HCSRMD23', 'Eduardo Moreno Ramírez', 'Alondra Ramírez', '9615826306', 'cumplido'),
  ('02cd55c0-3389-e6f2-015b-205597c87e68', 1, 'B', 'OURK191101MCSZBR24', 'Karla Ozuna Robles', 'Karla Robles', '9612586554', 'regular'),
  ('0e79f946-a47b-9c28-3e74-c26cc131a2bf', 1, 'B', 'MEAL200727HCSNLS25', 'José Luis Méndez Albores', 'Natalia Albores', '9684061027', 'bajo'),
  ('7fa7037a-455a-bc5d-6e35-c062c1b817f5', 1, 'B', 'GUGM200614MCSTRR26', 'Marisol Gutiérrez Grajales', 'Leslie Grajales', '9684632979', 'cumplido'),
  ('ad360239-e5fe-0078-f697-f05b8355d15d', 1, 'B', 'VAGN200615MCSZRT27', 'Natalia Vázquez Girón', 'Natalia Girón', '9612702144', 'regular'),
  ('eeb25f9d-f19e-c0ea-d3ba-d9600413d089', 1, 'B', 'GURF200816HCSTZR28', 'Francisco Gutiérrez Ruiz', 'Paola Ruiz', '9684112092', 'regular'),
  ('b43ffde4-01a5-ef5c-3a0e-64887eb16746', 1, 'B', 'AUDR200128HCSGZD29', 'Rodrigo Aguilar Díaz', 'Alexis Aguilar', '9615297049', 'cumplido'),
  ('222da004-def8-b0ab-d4dc-ae901fb2cf66', 2, 'A', 'RACM180908MCSMSR30', 'Marisol Ramírez Castillejos', 'Regina Castillejos', '9616199572', 'cumplido'),
  ('d1de05b9-6bc1-45b5-ea6b-645d56b0b776', 2, 'A', 'AOLY190326MCSLPR31', 'Yaretzi Albores López', 'Sofía López', '9688762311', 'cumplido'),
  ('783ca7a7-03a2-a9e2-98eb-7472dbe1d126', 2, 'A', 'NARU190319HCSJMR32', 'Uriel Nájera Ramírez', 'Yuliana Ramírez', '9611966882', 'regular'),
  ('41713864-5fe9-fbc8-72a4-3614afbb77c0', 2, 'A', 'HEGA190822MCSRRN33', 'Ana Karen Hernández Girón', 'Dulce Girón', '9615981860', 'regular'),
  ('52aa369f-581e-d830-1920-cd6e75bf2548', 2, 'A', 'HEEM190223MCSRSR34', 'Mariana Hernández Espinosa', 'Guadalupe Espinosa', '9682889074', 'cumplido'),
  ('f1d6c4df-e2d2-b804-797a-d8ed6cd4d083', 2, 'A', 'LOCE190526HCSPRM35', 'Emiliano López Cruz', 'Juana Cruz', '9686070765', 'cumplido'),
  ('e5d832bf-8b6f-8ef5-a5bb-ca5041fd70da', 2, 'A', 'CAME190313HCSSRD36', 'Eduardo Castillejos Morales', 'Abigail Morales', '9684683694', 'regular'),
  ('0c412a3d-872f-f4eb-74ec-6e39d7424951', 2, 'A', 'EIHJ190323HCSSDN37', 'Juan Carlos Espinosa Hidalgo', 'Jesús Espinosa', '9611391949', 'cumplido'),
  ('9d5b64af-b17c-d25e-99bc-26c10d0779e1', 2, 'A', 'RACA181110MCSMTB38', 'Abigail Ramírez Coutiño', 'Santiago Ramírez', '9611637682', 'regular'),
  ('4ecb8968-f4c4-9f97-3cb0-f9310e9929a0', 2, 'A', 'TUCY180929MCSRTR39', 'Yaretzi Trujillo Coutiño', 'María Coutiño', '9685073617', 'cumplido'),
  ('331db1f5-1c92-37c4-97a9-ec05f5df7757', 2, 'A', 'DOPJ181229HCSMNS40', 'Jesús Domínguez Penagos', 'Daniela Penagos', '9614371874', 'cumplido'),
  ('3da94839-2572-b0e0-c782-db97b3bd3b33', 2, 'A', 'AOHJ190501MCSLDN41', 'Juana Albores Hidalgo', 'Óscar Albores', '9613655736', 'regular'),
  ('9ce59463-d948-a760-54a6-a14cf1a6b68d', 2, 'A', 'GOGE190526HCSMRR42', 'Erick Gómez Grajales', 'Luis Gómez', '9683895290', 'cumplido'),
  ('68eecba3-eae2-e1d9-cf81-99a8451b9f5d', 2, 'A', 'RACN181022MCSMRT43', 'Natalia Ramírez Cruz', 'Juan Ramírez', '9684642712', 'regular'),
  ('bd97c241-f010-999c-2534-6cf147c715cd', 2, 'A', 'LODM190314MCSPMR44', 'Mariana López Domínguez', 'Karla Domínguez', '9683651537', 'bajo'),
  ('0d45aa6c-2f0c-3685-e3ea-bf8d5f2f2c09', 2, 'A', 'JIMS190218HCSMRN45', 'Santiago Jiménez Morales', 'Itzel Morales', '9614183925', 'cumplido'),
  ('0f220cf1-5995-f6d9-0582-cc35d7218cbb', 2, 'B', 'EIGI190302MCSSRT46', 'Itzel Espinosa Girón', 'Andrea Girón', '9611158525', 'regular'),
  ('cbbd4f5a-6d36-3ba9-ab68-c1408f1fb265', 2, 'B', 'GAEA181127MCSRSB47', 'Abigail Grajales Espinosa', 'Juan Grajales', '9616279323', 'cumplido'),
  ('96b6f0ab-d001-f856-6fac-81f545fb77cb', 2, 'B', 'VENJ190808HCSLJN48', 'Juan Carlos Velázquez Nájera', 'José Velázquez', '9612067037', 'cumplido'),
  ('d9c69137-b24b-053d-ef40-09bdc70d9e0f', 2, 'B', 'SACJ181025HCSNRS49', 'Jesús Sánchez Cruz', 'Erick Sánchez', '9612226936', 'cumplido'),
  ('0beca911-4c2e-5029-f02b-7e97a519a9d4', 2, 'B', 'VEGJ190501MCSLRN50', 'Juana Velázquez Grajales', 'Emiliano Velázquez', '9689706475', 'cumplido'),
  ('221d1507-d7a1-ffc9-9256-0993885ca878', 2, 'B', 'AOGR181013MCSLRS51', 'Rosa María Albores Grajales', 'Fernanda Grajales', '9616234931', 'cumplido'),
  ('10dc3dc9-bc1a-bbb0-00b3-068c599a5dc1', 2, 'B', 'COTA190518HCSTLL52', 'Alexis Coutiño Toledo', 'Yaretzi Toledo', '9689274426', 'cumplido'),
  ('6d2f30cc-ce36-db6e-4537-22b90b2f8a06', 2, 'B', 'AOMB190819HCSLRR53', 'Brayan Albores Martínez', 'Eduardo Albores', '9617402649', 'cumplido'),
  ('85807ecc-a46a-e3ad-b3b4-39013a585ff6', 2, 'B', 'CUTD190116MCSRLL54', 'Dulce María Cruz Toledo', 'Valeria Toledo', '9615470387', 'regular'),
  ('cdd0a8bb-76ac-79bd-4266-b25acb78d74a', 2, 'B', 'JIED190718MCSMSN55', 'Daniela Jiménez Espinosa', 'Yaretzi Espinosa', '9613067560', 'cumplido'),
  ('e49e7568-a2a6-5e20-23c9-2d0446c83552', 2, 'B', 'DOHJ190609MCSMRN56', 'Juana Domínguez Hernández', 'Pedro Domínguez', '9612593937', 'regular'),
  ('ea42b1db-063e-9a0e-c1b2-e10aa24f2a21', 2, 'B', 'EITG181217MCSSRT57', 'Getsemaní Espinosa Trujillo', 'Juana Trujillo', '9612007159', 'irregular'),
  ('0a11083c-3c89-a36f-4e75-96f7fdcf63f6', 2, 'B', 'AUHL190826HCSGDS58', 'José Luis Aguilar Hidalgo', 'Yaretzi Hidalgo', '9687956210', 'regular'),
  ('cf23c80c-fb5f-55b2-630a-52bc2bae15e8', 3, 'A', 'OUZM170907MCSZNR59', 'Marisol Ozuna Zenteno', 'Regina Zenteno', '9683027361', 'regular'),
  ('039c70f3-d463-922b-dda4-b9f5142f2914', 3, 'A', 'HEVY180423MCSRZR60', 'Yaretzi Hernández Vázquez', 'Fátima Vázquez', '9687198079', 'cumplido'),
  ('c13941a8-dc65-c23a-4042-ad08fdf14ae2', 3, 'A', 'RUJL180216HCSZMS61', 'José Luis Ruiz Jiménez', 'Adrián Ruiz', '9613865173', 'regular'),
  ('767715d9-0ff0-bb55-be7a-449badacebaa', 3, 'A', 'TUHP171108HCSRDD62', 'Pedro Trujillo Hidalgo', 'Daniela Hidalgo', '9611746235', 'cumplido'),
  ('b0101338-1876-a738-47ca-0a093b10d591', 3, 'A', 'ZEGM180210HCSNRR63', 'Mario Zenteno Grajales', 'Daniela Grajales', '9616486709', 'regular'),
  ('18db14d3-1d30-b179-2740-d8f4d1793d06', 3, 'A', 'CUHE180505HCSRRR64', 'Erick Cruz Hernández', 'Daniel Cruz', '9614334204', 'cumplido'),
  ('df472b51-3a14-4ad9-cbe5-31f3970cf1ae', 3, 'A', 'VAPI180330MCSZRT65', 'Itzel Vázquez Pérez', 'Óscar Vázquez', '9612522000', 'regular'),
  ('e43df58e-99cc-6160-55a2-9924788f8a6d', 3, 'A', 'COZJ180304MCSTNZ66', 'Jazmín Coutiño Zenteno', 'Natalia Zenteno', '9615319967', 'bajo'),
  ('e9c50026-661c-f59b-b9c4-5aa81771a86b', 3, 'A', 'RUVJ170915MCSZZN67', 'Juana Ruiz Vázquez', 'Sofía Vázquez', '9619523401', 'regular'),
  ('27f026b5-cccb-4ca4-1aec-06a6ba978f89', 3, 'A', 'AUCI171109HCSGMK68', 'Iker Aguilar Camacho', 'Yuliana Camacho', '9617102640', 'bajo'),
  ('5d4edeae-06c3-c096-d9f1-f8661493f639', 3, 'A', 'EISN171117MCSSNT69', 'Natalia Espinosa Sántiz', 'Elena Sántiz', '9613415550', 'cumplido'),
  ('c8cdfb1f-9a50-eedd-2d3d-b2d457e89b5e', 3, 'A', 'AUNL171201HCSGCS70', 'Luis Ángel Aguilar Nucamendi', 'Natalia Nucamendi', '9686983608', 'cumplido'),
  ('ab9d0712-2879-6423-18da-240f6b06cc4b', 3, 'A', 'PEMK180815HCSRRV71', 'Kevin Pérez Moreno', 'Juana Moreno', '9689216512', 'irregular'),
  ('c3010ae8-9122-769f-90d5-7d36acc311ba', 3, 'A', 'MANO180306HCSRJS72', 'Óscar Martínez Nájera', 'Santiago Martínez', '9617824903', 'cumplido'),
  ('eb0ccfff-78e2-0d39-2a01-820352720430', 3, 'A', 'NALX180430MCSJPM73', 'Ximena Nájera López', 'Valeria López', '9615315564', 'cumplido'),
  ('9447c5ba-936d-79f4-724a-e0bb63f783fe', 3, 'B', 'NASA171017HCSJNL74', 'Alexis Nájera Sántiz', 'Abigail Sántiz', '9613863352', 'cumplido'),
  ('455fa312-1832-b03e-0dff-7399ec06ef01', 3, 'B', 'PEGS180602MCSNTF75', 'Sofía Penagos Gutiérrez', 'Francisco Penagos', '9688099740', 'cumplido'),
  ('d2d2c533-ded9-2250-b7b2-03b848c92c77', 3, 'B', 'VANE180720MCSZCL76', 'Elena Vázquez Nucamendi', 'Mario Vázquez', '9614540890', 'regular'),
  ('656e7860-214d-07e6-03d7-3728fcbd9c86', 3, 'B', 'GAGS171029HCSRTN77', 'Santiago Grajales Gutiérrez', 'Juana Gutiérrez', '9614175914', 'irregular'),
  ('30acb2b4-bccd-5b70-efc4-74d10919fd02', 3, 'B', 'HIJJ180729MCSDMS78', 'María José Hidalgo Jiménez', 'Sebastián Hidalgo', '9617127492', 'cumplido'),
  ('ef8990f9-14b4-672e-f125-1512ae824919', 3, 'B', 'AOAK180301MCSLGR79', 'Karla Albores Aguilar', 'Ximena Aguilar', '9613415788', 'regular'),
  ('952a6947-e0c6-0b62-8222-3b32e15b05b5', 3, 'B', 'MOPE180824MCSRRS80', 'Esmeralda Morales Pérez', 'Yaretzi Pérez', '9612322511', 'cumplido'),
  ('4de00d6f-111f-2eca-f31c-0921c62ddd95', 3, 'B', 'TURN180120MCSRZT81', 'Natalia Trujillo Ruiz', 'Fernanda Ruiz', '9681702516', 'cumplido'),
  ('e016bc35-b8a3-3aff-23e5-ea015c5162e0', 3, 'B', 'RUMM180728MCSZRR82', 'Mariana Ruiz Morales', 'Adrián Ruiz', '9689030089', 'cumplido'),
  ('8f4cd82a-9562-3b60-075f-d0714e1523ec', 3, 'B', 'CUHR171024HCSRRD83', 'Rodrigo Cruz Hernández', 'Camila Hernández', '9685277321', 'cumplido'),
  ('44d94823-7397-2f2c-7534-44597bd4a064', 3, 'B', 'TUVD180219HCSRLG84', 'Diego Trujillo Velázquez', 'Óscar Trujillo', '9615060217', 'cumplido'),
  ('9473016b-662d-c252-9ce8-77819c2e079f', 3, 'B', 'SADE180101MCSNML85', 'Elena Sánchez Domínguez', 'Marisol Domínguez', '9618027424', 'cumplido'),
  ('324f79d5-2483-8228-b513-258e027c9cc7', 3, 'B', 'ROSK171029HCSBNV86', 'Kevin Robles Sántiz', 'Mariana Sántiz', '9619100660', 'cumplido'),
  ('f5d3f9f0-632a-84a6-7b9c-4f7dd093a37f', 3, 'B', 'MOLS180530MCSRPF87', 'Sofía Morales López', 'Ximena López', '9615043912', 'regular'),
  ('fd6c5ebe-59ac-f631-b5cb-503a75404f99', 4, 'A', 'TOHD170228MCSLRN88', 'Daniela Toledo Hernández', 'Karla Hernández', '9619898227', 'cumplido'),
  ('fe7474ad-a23a-0314-8961-c2a780b87ceb', 4, 'A', 'VADL170611MCSZZS89', 'Leslie Vázquez Díaz', 'Andrea Díaz', '9612772651', 'regular'),
  ('d719fe7f-f91c-857e-e6f3-99faaec8c1e4', 4, 'A', 'GOSA161210MCSMNN90', 'Andrea Gómez Sánchez', 'Alondra Sánchez', '9619803364', 'cumplido'),
  ('b4150604-c227-2f42-8832-5afa1a8d0d1c', 4, 'A', 'RAGF160919MCSMTR91', 'Fernanda Ramírez Gutiérrez', 'Yuliana Gutiérrez', '9682940945', 'irregular'),
  ('df0ff2c4-bdd8-7a2b-6527-a95ff086e14d', 4, 'A', 'AONE170720HCSLJD92', 'Eduardo Albores Nájera', 'Brayan Albores', '9689077566', 'cumplido'),
  ('40ceef43-f822-4d7a-2496-8541ec6d4be5', 4, 'A', 'DIAA161214HCSZGL93', 'Alexis Díaz Aguilar', 'Fátima Aguilar', '9681731566', 'cumplido'),
  ('8f9a9314-5fdb-d377-d3b6-45c5fc501ef4', 4, 'A', 'EIGF170608MCSSTR94', 'Fernanda Espinosa Gutiérrez', 'Mariana Gutiérrez', '9684992785', 'cumplido'),
  ('c6b9aaf7-9524-39f5-1e5f-075dc189756a', 4, 'A', 'MAEE170321HCSRSD95', 'Eduardo Martínez Espinosa', 'Regina Espinosa', '9611253851', 'cumplido'),
  ('ca4628ac-c1cf-ba3a-dc53-fd69d77cef88', 4, 'A', 'MOGJ161231HCSRTL96', 'Joel Moreno Gutiérrez', 'Sofía Gutiérrez', '9686655464', 'cumplido'),
  ('0c819d9c-e10f-2907-f610-5dc212c9db70', 4, 'A', 'MEHA170224HCSNRD97', 'Adrián Méndez Hernández', 'Alondra Hernández', '9619670768', 'regular'),
  ('8a9cf017-f7bc-10e6-ceb7-d827c95ccf12', 4, 'A', 'JICM161129MCSMTR98', 'Marisol Jiménez Coutiño', 'Valeria Coutiño', '9611025285', 'regular'),
  ('ce150ab2-fdb2-4454-c8b3-42b8bdccaebf', 4, 'B', 'CAZE170521HCSSNR99', 'Erick Castillejos Zenteno', 'Santiago Castillejos', '9681352534', 'regular'),
  ('b7f2b950-c7b9-cbbf-c865-0cf018d8295c', 4, 'B', 'MOSE170203HCSRNMA0', 'Emiliano Morales Sánchez', 'Mariana Sánchez', '9684013854', 'cumplido'),
  ('28d13806-dfc4-61ab-4210-c58459ceeb42', 4, 'B', 'ZEMJ170423HCSNRNA1', 'Juan Carlos Zenteno Moreno', 'Regina Moreno', '9688909835', 'regular'),
  ('6c8523f1-57fb-3d98-05ba-799e7382e41a', 4, 'B', 'VEDM161105HCSLZRA2', 'Mario Velázquez Díaz', 'Karla Díaz', '9613476877', 'cumplido'),
  ('ece27259-746d-4acf-df4c-a7760bc9d948', 4, 'B', 'ROGJ161117MCSBRSA3', 'María José Robles Girón', 'Juana Girón', '9618450406', 'regular'),
  ('78d3f5a4-bf4f-010d-faab-a171339675de', 4, 'B', 'CORL161005HCSTBNA4', 'Leonardo Coutiño Robles', 'Sebastián Coutiño', '9618449199', 'regular'),
  ('6e85b1bc-418d-76ae-61de-d7d27b0f742c', 4, 'B', 'ROCD170429MCSBSNA5', 'Daniela Robles Castillejos', 'Yaretzi Castillejos', '9612705584', 'regular'),
  ('c5d7bc29-65a4-d217-c143-2b1b1d2f3740', 4, 'B', 'VAGI170831HCSZRKA6', 'Iker Vázquez Girón', 'Abraham Vázquez', '9616459827', 'cumplido'),
  ('073a3bfc-117a-931d-e429-cf983e177a74', 4, 'B', 'MOCL170705HCSRRNA7', 'Leonardo Morales Cruz', 'Natalia Cruz', '9614484049', 'regular'),
  ('937cb0e3-57bf-b514-b865-829dd6d80f2a', 4, 'B', 'EIMG170822MCSSRTA8', 'Getsemaní Espinosa Morales', 'Marisol Morales', '9615069568', 'cumplido'),
  ('4f26c755-e9fe-1f71-bc46-cee95488851a', 4, 'B', 'SANG161126MCSNCDA9', 'Guadalupe Sántiz Nucamendi', 'Ángel Sántiz', '9617294029', 'regular'),
  ('0e2e3611-32a3-5405-d505-fcee3ee9ad41', 4, 'B', 'LONO170220HCSPJSB0', 'Óscar López Nájera', 'Yuliana Nájera', '9614788791', 'bajo'),
  ('19365f69-4140-3dcd-b8f7-76e64ab093ae', 4, 'B', 'NAGL170227MCSJRSB1', 'Leslie Nájera Grajales', 'Leonardo Nájera', '9618067880', 'cumplido'),
  ('0c474418-20e8-2690-e578-8fcdb10d212f', 4, 'B', 'PESF170614MCSNNTB2', 'Fátima Penagos Sánchez', 'Paola Sánchez', '9681488845', 'cumplido'),
  ('a3511c3c-272a-73b2-febc-e9835ec478d4', 4, 'B', 'CADK170501HCSMMVB3', 'Kevin Camacho Domínguez', 'Alexis Camacho', '9619607533', 'cumplido'),
  ('ada73117-8c94-0c21-8ea2-6e8f13f857bd', 5, 'A', 'RUVS151221HCSZLNB4', 'Santiago Ruiz Velázquez', 'Esmeralda Velázquez', '9686821856', 'regular'),
  ('23a58e56-0391-77cb-8178-59915ab1898f', 5, 'A', 'SACP160207HCSNTDB5', 'Pedro Sánchez Coutiño', 'Mateo Sánchez', '9616733687', 'regular'),
  ('4c4e5653-2e7d-ef6c-89fb-0c282df81224', 5, 'A', 'CARJ160726MCSSZNB6', 'Juana Castillejos Ruiz', 'Yuliana Ruiz', '9619148910', 'cumplido'),
  ('e3774a5c-3deb-d1fd-24fb-3c7ff9930a85', 5, 'A', 'MEGE151231HCSNRMB7', 'Emiliano Méndez Grajales', 'Esmeralda Grajales', '9618106560', 'regular'),
  ('c0163aa9-5e0a-7479-8569-276394768f73', 5, 'A', 'HEAS160404HCSRLNB8', 'Santiago Hernández Albores', 'Diego Hernández', '9619352929', 'cumplido'),
  ('1a1f3592-c99f-dfb4-8508-c45fa5111899', 5, 'A', 'RUPP160327MCSZRLB9', 'Paola Ruiz Pérez', 'Juana Pérez', '9615290582', 'regular'),
  ('032c9c67-d304-fe99-7440-fdb0d5e35b70', 5, 'A', 'RUGF151126HCSZRRC0', 'Francisco Ruiz Grajales', 'Ximena Grajales', '9686159528', 'cumplido'),
  ('ffb86a50-730a-74fc-c0be-7bf6f87fcb8e', 5, 'A', 'RUML160305MCSZRSC1', 'Leslie Ruiz Martínez', 'Diego Ruiz', '9612388707', 'regular'),
  ('b63d7f4a-6ef5-bd30-d194-0a6340cf445a', 5, 'A', 'TONY151229MCSLCRC2', 'Yaretzi Toledo Nucamendi', 'Kevin Toledo', '9688030667', 'cumplido'),
  ('a12e41c0-41b4-6bea-5f02-3a119552d34d', 5, 'A', 'AOGK160330MCSLRRC3', 'Karla Albores Girón', 'Daniel Albores', '9618411680', 'cumplido'),
  ('8cde4d68-13be-9b1d-2e87-e5ecf16c5ecc', 5, 'A', 'NUVD160707MCSCLNC4', 'Daniela Nucamendi Velázquez', 'Getsemaní Velázquez', '9616664582', 'regular'),
  ('86f9ccc9-7e5c-0ab8-5bda-379e43ea9832', 5, 'A', 'DOTJ160710HCSMLSC5', 'Josué Domínguez Toledo', 'Andrea Toledo', '9682786848', 'bajo'),
  ('ca54e4e3-e5f2-15e4-9327-1af0defc7241', 5, 'A', 'ROCA160618MCSBTLC6', 'Alondra Robles Coutiño', 'María Coutiño', '9617481794', 'regular'),
  ('5626057e-e9f6-cafc-1a2a-b06ab5c09b35', 5, 'A', 'OUGL160303MCSZMSC7', 'Leslie Ozuna Gómez', 'Guadalupe Gómez', '9681388221', 'regular'),
  ('03939d1c-985f-37dd-22c8-27f748e79f9b', 5, 'B', 'EIPN151030MCSSRTC8', 'Natalia Espinosa Pérez', 'Francisco Espinosa', '9617441304', 'cumplido'),
  ('7b2c3f91-fd6a-27b5-c0e9-6657a1b31310', 5, 'B', 'VAPJ151010MCSZRSC9', 'María José Vázquez Pérez', 'Guadalupe Pérez', '9687159258', 'irregular'),
  ('4dff8343-9776-b18d-f1ee-80e6b62a6a2b', 5, 'B', 'EITV160721MCSSRLD0', 'Valeria Espinosa Trujillo', 'Itzel Trujillo', '9612813509', 'regular'),
  ('e206a841-19fb-9510-7a6f-ccf4976fc41d', 5, 'B', 'DIRE151007HCSZZMD1', 'Emiliano Díaz Ruiz', 'Manuel Díaz', '9613297261', 'cumplido'),
  ('a99c0f1a-5ada-a06a-9263-249e2eebc46a', 5, 'B', 'CAPG160612HCSSNLD2', 'Gael Castillejos Penagos', 'Leslie Penagos', '9614190514', 'irregular'),
  ('4982afef-c5af-4db7-2f2b-a15b5c9c0e76', 5, 'B', 'JIAI160724MCSMGTD3', 'Itzel Jiménez Aguilar', 'Alexis Jiménez', '9687663849', 'regular'),
  ('3a736fce-cf7b-bd3d-4dad-1dfd809345ff', 5, 'B', 'CAOA160413HCSSZDD4', 'Adrián Castillejos Ozuna', 'Ximena Ozuna', '9615822268', 'regular'),
  ('7d61cfdc-d140-ea21-8b4a-63313f61c7fb', 5, 'B', 'TOSA160117HCSLNND5', 'Ángel Toledo Sántiz', 'Adrián Toledo', '9683529070', 'cumplido'),
  ('641ad39e-ff59-abaf-0839-14f7eff0cd56', 5, 'B', 'HERG151208HCSRZLD6', 'Gael Hernández Ruiz', 'Fernanda Ruiz', '9617558437', 'bajo'),
  ('4c1ab097-92ea-0fb5-ae78-316ae569c1c2', 5, 'B', 'MEAU160609HCSNGRD7', 'Uriel Méndez Aguilar', 'Yaretzi Aguilar', '9612557483', 'cumplido'),
  ('867af794-7025-5f0f-ae57-3871e1880899', 5, 'B', 'MAAD160612HCSRLGD8', 'Diego Martínez Albores', 'Leslie Albores', '9613865627', 'cumplido'),
  ('03a8842e-0a44-78d0-835b-8955c1c94a3c', 5, 'B', 'VEMR160107MCSLRSD9', 'Rosa María Velázquez Morales', 'Jazmín Morales', '9614205470', 'cumplido'),
  ('26aa159e-431a-6cc2-be97-3a76733c0fb1', 5, 'B', 'OUDU160724HCSZZRE0', 'Uriel Ozuna Díaz', 'Fátima Díaz', '9619964843', 'cumplido'),
  ('803265f5-ebfa-2dc4-57b1-8b9e5af71948', 6, 'A', 'MAAM150501MCSRGRE1', 'Marisol Martínez Aguilar', 'Guadalupe Aguilar', '9613547595', 'cumplido'),
  ('f2e89637-d859-7eb6-6edc-c31e226635cc', 6, 'A', 'RUVA150205MCSZZNE2', 'Ana Karen Ruiz Vázquez', 'Rosa Vázquez', '9612205301', 'cumplido'),
  ('41788362-e063-70c4-bbcd-d7880e5ef68a', 6, 'A', 'CUPI141005MCSRRTE3', 'Itzel Cruz Pérez', 'Abigail Pérez', '9614380270', 'regular'),
  ('ac3918f9-ac94-87ba-6344-5dac348f7cd3', 6, 'A', 'COSJ140915HCSTNNE4', 'Juan Carlos Coutiño Sántiz', 'Yaretzi Sántiz', '9615244981', 'cumplido'),
  ('3fcf8210-9c1a-0d80-3b65-9c83c9aa14c8', 6, 'A', 'ZEER150713MCSNSSE5', 'Rosa María Zenteno Espinosa', 'Paola Espinosa', '9689259507', 'irregular'),
  ('c9847e2b-9f3f-e10b-f17a-c2230b814b29', 6, 'A', 'TOPE150718MCSLRLE6', 'Elena Toledo Pérez', 'Marisol Pérez', '9614386520', 'cumplido'),
  ('fa27a611-2c24-53bb-12c0-0e439eb0065f', 6, 'A', 'TUGN150326MCSRRTE7', 'Natalia Trujillo Grajales', 'Alondra Grajales', '9611348839', 'cumplido'),
  ('600e08b2-a914-36d9-358c-48a4c00fe7cd', 6, 'A', 'OUJL150804HCSZMSE8', 'Luis Ángel Ozuna Jiménez', 'Valeria Jiménez', '9686971552', 'bajo'),
  ('90417ea5-2b34-0c77-2345-31c661cb26d3', 6, 'A', 'SATV141225MCSNLLE9', 'Valeria Sánchez Toledo', 'Daniela Toledo', '9618720210', 'bajo'),
  ('a0b46f59-dddc-684c-e1b2-78658f06bc4d', 6, 'A', 'LOTE150502HCSPRMF0', 'Emiliano López Trujillo', 'Andrea Trujillo', '9683219072', 'regular'),
  ('5b495c62-d3b3-982f-0d0b-d63f90d14ecb', 6, 'A', 'NUTC150125MCSCLMF1', 'Camila Nucamendi Toledo', 'Abigail Toledo', '9688256476', 'cumplido'),
  ('c4f06e79-1fcd-3c96-5aba-afccb3c5b7ad', 6, 'A', 'PEVA150709MCSNZNF2', 'Andrea Penagos Vázquez', 'Fátima Vázquez', '9689215716', 'cumplido'),
  ('917142b3-4da4-40a0-0f23-726a5433b662', 6, 'A', 'SAZE150609MCSNNLF3', 'Elena Sánchez Zenteno', 'Sofía Zenteno', '9685496071', 'cumplido'),
  ('d2affca7-6176-8cda-b00c-68800d349040', 6, 'A', 'MANC150716MCSRCMF4', 'Camila Martínez Nucamendi', 'Yuliana Nucamendi', '9611720013', 'irregular'),
  ('2ee2a54e-95dd-43f7-1093-c4fc4eb65779', 6, 'A', 'MELE150120MCSNPLF5', 'Elena Méndez López', 'Adrián Méndez', '9612129219', 'regular'),
  ('f7d769e0-149c-95f7-1a49-e40c42044aa7', 6, 'A', 'COCD141017MCSTSLF6', 'Dulce María Coutiño Castillejos', 'Rosa Castillejos', '9612999438', 'regular'),
  ('8c40efa4-251f-a760-75c6-3437ba6f91c3', 6, 'B', 'COMF150114HCSTRRF7', 'Fernando Coutiño Martínez', 'Daniela Martínez', '9615753065', 'irregular'),
  ('bc7270df-f748-c95c-7df3-9665e75d72c6', 6, 'B', 'OUAA150424MCSZGLF8', 'Alondra Ozuna Aguilar', 'Diego Ozuna', '9683161862', 'cumplido'),
  ('4894a384-b6ec-facb-5088-56d9c55c4896', 6, 'B', 'GOMA150320MCSMRNF9', 'Andrea Gómez Moreno', 'Uriel Gómez', '9611127766', 'regular'),
  ('8ef248f0-b3a1-420b-f461-560fe097ad1f', 6, 'B', 'PEHD140922HCSRRGG0', 'Diego Pérez Hernández', 'Juana Hernández', '9611312897', 'cumplido'),
  ('a3c7ff64-5262-ca31-fbce-f30b32394995', 6, 'B', 'RURJ140927HCSZBNG1', 'Juan Carlos Ruiz Robles', 'Leslie Robles', '9683614796', 'cumplido'),
  ('e744a498-8b78-4645-ab84-e6d13c562ae1', 6, 'B', 'PERL140917HCSNBSG2', 'Luis Ángel Penagos Robles', 'Itzel Robles', '9689448026', 'cumplido'),
  ('a69b6f4e-0749-9529-de8d-3e87731c13c4', 6, 'B', 'DODP141024HCSMZDG3', 'Pedro Domínguez Díaz', 'Regina Díaz', '9612402952', 'cumplido'),
  ('452993d8-549e-8719-3652-049dc7a0f6e1', 6, 'B', 'SANJ150102HCSNJNG4', 'Juan Carlos Sánchez Nájera', 'Miguel Sánchez', '9611094118', 'regular'),
  ('3717efcb-279c-c7c6-84a3-8c2dc5041312', 6, 'B', 'NUGL150319HCSCTSG5', 'José Luis Nucamendi Gutiérrez', 'Esmeralda Gutiérrez', '9618228764', 'cumplido'),
  ('3fd42296-1dd0-3460-b184-681f89bdfa44', 6, 'B', 'GAMG150630MCSRRTG6', 'Getsemaní Grajales Moreno', 'Guadalupe Moreno', '9613320274', 'cumplido'),
  ('8ed011a3-e81d-0fb4-6a83-aa1e3fe81ec9', 6, 'B', 'JIRS150501HCSMBNG7', 'Santiago Jiménez Robles', 'Yaretzi Robles', '9613907133', 'regular'),
  ('b21d1b5f-8b4c-323e-ca3f-fc0ab4f9a104', 6, 'B', 'NADI141207HCSJZKG8', 'Iker Nájera Díaz', 'Guadalupe Díaz', '9619165080', 'regular');

INSERT INTO alumnos (id, grupo_id, curp, nombre, tutor_nombre, tutor_telefono)
SELECT n.id, g.id, n.curp, n.nombre, n.tutor, n.tel
  FROM nuevos_alumnos n JOIN grupos g ON g.escuela_id = '11111111-1111-1111-1111-111111111111' AND g.grado = n.grado AND g.letra = n.letra AND g.ciclo = '2026-2027'
ON CONFLICT DO NOTHING;

-- 5) Horario semanal (no se repite una clase que ya tenga el grupo a esa hora)
CREATE TEMP TABLE nuevo_horario (grado int, letra char(1), materia text, email text, dia text, ini time, fin time) ON COMMIT DROP;
INSERT INTO nuevo_horario VALUES
  (1, 'A', 'Educación Física', 'marco.ozuna@escuela.mx', 'lunes', '08:00', '09:00'),
  (1, 'A', 'Español', 'rosa.coutino@escuela.mx', 'lunes', '09:00', '10:00'),
  (1, 'A', 'Matemáticas', 'rosa.coutino@escuela.mx', 'lunes', '10:30', '11:30'),
  (1, 'A', 'Ciencias Naturales', 'rosa.coutino@escuela.mx', 'lunes', '11:30', '12:30'),
  (1, 'A', 'Matemáticas', 'rosa.coutino@escuela.mx', 'martes', '08:00', '09:00'),
  (1, 'A', 'Español', 'rosa.coutino@escuela.mx', 'martes', '09:00', '10:00'),
  (1, 'A', 'Inglés', 'karen.morales@escuela.mx', 'martes', '10:30', '11:30'),
  (1, 'A', 'Historia', 'rosa.coutino@escuela.mx', 'martes', '11:30', '12:30'),
  (1, 'A', 'Matemáticas', 'rosa.coutino@escuela.mx', 'miercoles', '08:00', '09:00'),
  (1, 'A', 'Español', 'rosa.coutino@escuela.mx', 'miercoles', '09:00', '10:00'),
  (1, 'A', 'Educación Física', 'marco.ozuna@escuela.mx', 'miercoles', '10:30', '11:30'),
  (1, 'A', 'Artes', 'rosa.coutino@escuela.mx', 'miercoles', '11:30', '12:30'),
  (1, 'A', 'Matemáticas', 'rosa.coutino@escuela.mx', 'jueves', '08:00', '09:00'),
  (1, 'A', 'Español', 'rosa.coutino@escuela.mx', 'jueves', '09:00', '10:00'),
  (1, 'A', 'Geografía', 'rosa.coutino@escuela.mx', 'jueves', '10:30', '11:30'),
  (1, 'A', 'Ciencias Naturales', 'rosa.coutino@escuela.mx', 'jueves', '11:30', '12:30'),
  (1, 'A', 'Matemáticas', 'rosa.coutino@escuela.mx', 'viernes', '08:00', '09:00'),
  (1, 'A', 'Español', 'rosa.coutino@escuela.mx', 'viernes', '09:00', '10:00'),
  (1, 'A', 'Formación Cívica y Ética', 'rosa.coutino@escuela.mx', 'viernes', '10:30', '11:30'),
  (1, 'A', 'Artes', 'rosa.coutino@escuela.mx', 'viernes', '11:30', '12:30'),
  (1, 'B', 'Español', 'adriana.grajales@escuela.mx', 'lunes', '08:00', '09:00'),
  (1, 'B', 'Educación Física', 'marco.ozuna@escuela.mx', 'lunes', '09:00', '10:00'),
  (1, 'B', 'Matemáticas', 'adriana.grajales@escuela.mx', 'lunes', '10:30', '11:30'),
  (1, 'B', 'Ciencias Naturales', 'adriana.grajales@escuela.mx', 'lunes', '11:30', '12:30'),
  (1, 'B', 'Matemáticas', 'adriana.grajales@escuela.mx', 'martes', '08:00', '09:00'),
  (1, 'B', 'Español', 'adriana.grajales@escuela.mx', 'martes', '09:00', '10:00'),
  (1, 'B', 'Historia', 'adriana.grajales@escuela.mx', 'martes', '10:30', '11:30'),
  (1, 'B', 'Inglés', 'karen.morales@escuela.mx', 'martes', '11:30', '12:30'),
  (1, 'B', 'Matemáticas', 'adriana.grajales@escuela.mx', 'miercoles', '08:00', '09:00'),
  (1, 'B', 'Español', 'adriana.grajales@escuela.mx', 'miercoles', '09:00', '10:00'),
  (1, 'B', 'Artes', 'adriana.grajales@escuela.mx', 'miercoles', '10:30', '11:30'),
  (1, 'B', 'Educación Física', 'marco.ozuna@escuela.mx', 'miercoles', '11:30', '12:30'),
  (1, 'B', 'Matemáticas', 'adriana.grajales@escuela.mx', 'jueves', '08:00', '09:00'),
  (1, 'B', 'Español', 'adriana.grajales@escuela.mx', 'jueves', '09:00', '10:00'),
  (1, 'B', 'Geografía', 'adriana.grajales@escuela.mx', 'jueves', '10:30', '11:30'),
  (1, 'B', 'Ciencias Naturales', 'adriana.grajales@escuela.mx', 'jueves', '11:30', '12:30'),
  (1, 'B', 'Matemáticas', 'adriana.grajales@escuela.mx', 'viernes', '08:00', '09:00'),
  (1, 'B', 'Español', 'adriana.grajales@escuela.mx', 'viernes', '09:00', '10:00'),
  (1, 'B', 'Formación Cívica y Ética', 'adriana.grajales@escuela.mx', 'viernes', '10:30', '11:30'),
  (1, 'B', 'Artes', 'adriana.grajales@escuela.mx', 'viernes', '11:30', '12:30'),
  (2, 'A', 'Español', 'carmen.nucamendi@escuela.mx', 'lunes', '08:00', '09:00'),
  (2, 'A', 'Matemáticas', 'carmen.nucamendi@escuela.mx', 'lunes', '09:00', '10:00'),
  (2, 'A', 'Educación Física', 'marco.ozuna@escuela.mx', 'lunes', '10:30', '11:30'),
  (2, 'A', 'Español', 'carmen.nucamendi@escuela.mx', 'lunes', '11:30', '12:30'),
  (2, 'A', 'Español', 'carmen.nucamendi@escuela.mx', 'martes', '08:00', '09:00'),
  (2, 'A', 'Matemáticas', 'carmen.nucamendi@escuela.mx', 'martes', '09:00', '10:00'),
  (2, 'A', 'Matemáticas', 'carmen.nucamendi@escuela.mx', 'martes', '10:30', '11:30'),
  (2, 'A', 'Ciencias Naturales', 'carmen.nucamendi@escuela.mx', 'martes', '11:30', '12:30'),
  (2, 'A', 'Inglés', 'karen.morales@escuela.mx', 'miercoles', '08:00', '09:00'),
  (2, 'A', 'Español', 'carmen.nucamendi@escuela.mx', 'miercoles', '09:00', '10:00'),
  (2, 'A', 'Historia', 'carmen.nucamendi@escuela.mx', 'miercoles', '10:30', '11:30'),
  (2, 'A', 'Artes', 'carmen.nucamendi@escuela.mx', 'miercoles', '11:30', '12:30'),
  (2, 'A', 'Educación Física', 'marco.ozuna@escuela.mx', 'jueves', '08:00', '09:00'),
  (2, 'A', 'Matemáticas', 'carmen.nucamendi@escuela.mx', 'jueves', '09:00', '10:00'),
  (2, 'A', 'Geografía', 'carmen.nucamendi@escuela.mx', 'jueves', '10:30', '11:30'),
  (2, 'A', 'Ciencias Naturales', 'carmen.nucamendi@escuela.mx', 'jueves', '11:30', '12:30'),
  (2, 'A', 'Español', 'carmen.nucamendi@escuela.mx', 'viernes', '08:00', '09:00'),
  (2, 'A', 'Matemáticas', 'carmen.nucamendi@escuela.mx', 'viernes', '09:00', '10:00'),
  (2, 'A', 'Formación Cívica y Ética', 'carmen.nucamendi@escuela.mx', 'viernes', '10:30', '11:30'),
  (2, 'A', 'Artes', 'carmen.nucamendi@escuela.mx', 'viernes', '11:30', '12:30'),
  (2, 'B', 'Español', 'hector.zenteno@escuela.mx', 'lunes', '08:00', '09:00'),
  (2, 'B', 'Matemáticas', 'hector.zenteno@escuela.mx', 'lunes', '09:00', '10:00'),
  (2, 'B', 'Español', 'hector.zenteno@escuela.mx', 'lunes', '10:30', '11:30'),
  (2, 'B', 'Educación Física', 'marco.ozuna@escuela.mx', 'lunes', '11:30', '12:30'),
  (2, 'B', 'Español', 'hector.zenteno@escuela.mx', 'martes', '08:00', '09:00'),
  (2, 'B', 'Matemáticas', 'hector.zenteno@escuela.mx', 'martes', '09:00', '10:00'),
  (2, 'B', 'Matemáticas', 'hector.zenteno@escuela.mx', 'martes', '10:30', '11:30'),
  (2, 'B', 'Ciencias Naturales', 'hector.zenteno@escuela.mx', 'martes', '11:30', '12:30'),
  (2, 'B', 'Español', 'hector.zenteno@escuela.mx', 'miercoles', '08:00', '09:00'),
  (2, 'B', 'Inglés', 'karen.morales@escuela.mx', 'miercoles', '09:00', '10:00'),
  (2, 'B', 'Historia', 'hector.zenteno@escuela.mx', 'miercoles', '10:30', '11:30'),
  (2, 'B', 'Artes', 'hector.zenteno@escuela.mx', 'miercoles', '11:30', '12:30'),
  (2, 'B', 'Matemáticas', 'hector.zenteno@escuela.mx', 'jueves', '08:00', '09:00'),
  (2, 'B', 'Educación Física', 'marco.ozuna@escuela.mx', 'jueves', '09:00', '10:00'),
  (2, 'B', 'Geografía', 'hector.zenteno@escuela.mx', 'jueves', '10:30', '11:30'),
  (2, 'B', 'Ciencias Naturales', 'hector.zenteno@escuela.mx', 'jueves', '11:30', '12:30'),
  (2, 'B', 'Español', 'hector.zenteno@escuela.mx', 'viernes', '08:00', '09:00'),
  (2, 'B', 'Matemáticas', 'hector.zenteno@escuela.mx', 'viernes', '09:00', '10:00'),
  (2, 'B', 'Formación Cívica y Ética', 'hector.zenteno@escuela.mx', 'viernes', '10:30', '11:30'),
  (2, 'B', 'Artes', 'hector.zenteno@escuela.mx', 'viernes', '11:30', '12:30'),
  (3, 'A', 'Español', 'patricia.albores@escuela.mx', 'lunes', '08:00', '09:00'),
  (3, 'A', 'Matemáticas', 'patricia.albores@escuela.mx', 'lunes', '09:00', '10:00'),
  (3, 'A', 'Matemáticas', 'patricia.albores@escuela.mx', 'lunes', '10:30', '11:30'),
  (3, 'A', 'Ciencias Naturales', 'patricia.albores@escuela.mx', 'lunes', '11:30', '12:30'),
  (3, 'A', 'Educación Física', 'marco.ozuna@escuela.mx', 'martes', '08:00', '09:00'),
  (3, 'A', 'Español', 'patricia.albores@escuela.mx', 'martes', '09:00', '10:00'),
  (3, 'A', 'Historia', 'patricia.albores@escuela.mx', 'martes', '10:30', '11:30'),
  (3, 'A', 'Artes', 'patricia.albores@escuela.mx', 'martes', '11:30', '12:30'),
  (3, 'A', 'Matemáticas', 'patricia.albores@escuela.mx', 'miercoles', '08:00', '09:00'),
  (3, 'A', 'Español', 'patricia.albores@escuela.mx', 'miercoles', '09:00', '10:00'),
  (3, 'A', 'Inglés', 'karen.morales@escuela.mx', 'miercoles', '10:30', '11:30'),
  (3, 'A', 'Geografía', 'patricia.albores@escuela.mx', 'miercoles', '11:30', '12:30'),
  (3, 'A', 'Matemáticas', 'patricia.albores@escuela.mx', 'jueves', '08:00', '09:00'),
  (3, 'A', 'Español', 'patricia.albores@escuela.mx', 'jueves', '09:00', '10:00'),
  (3, 'A', 'Educación Física', 'marco.ozuna@escuela.mx', 'jueves', '10:30', '11:30'),
  (3, 'A', 'Ciencias Naturales', 'patricia.albores@escuela.mx', 'jueves', '11:30', '12:30'),
  (3, 'A', 'Matemáticas', 'patricia.albores@escuela.mx', 'viernes', '08:00', '09:00'),
  (3, 'A', 'Español', 'patricia.albores@escuela.mx', 'viernes', '09:00', '10:00'),
  (3, 'A', 'Formación Cívica y Ética', 'patricia.albores@escuela.mx', 'viernes', '10:30', '11:30'),
  (3, 'A', 'Artes', 'patricia.albores@escuela.mx', 'viernes', '11:30', '12:30'),
  (3, 'B', 'Español', 'ricardo.penagos@escuela.mx', 'lunes', '08:00', '09:00'),
  (3, 'B', 'Matemáticas', 'ricardo.penagos@escuela.mx', 'lunes', '09:00', '10:00'),
  (3, 'B', 'Matemáticas', 'ricardo.penagos@escuela.mx', 'lunes', '10:30', '11:30'),
  (3, 'B', 'Ciencias Naturales', 'ricardo.penagos@escuela.mx', 'lunes', '11:30', '12:30'),
  (3, 'B', 'Español', 'ricardo.penagos@escuela.mx', 'martes', '08:00', '09:00'),
  (3, 'B', 'Educación Física', 'marco.ozuna@escuela.mx', 'martes', '09:00', '10:00'),
  (3, 'B', 'Historia', 'ricardo.penagos@escuela.mx', 'martes', '10:30', '11:30'),
  (3, 'B', 'Artes', 'ricardo.penagos@escuela.mx', 'martes', '11:30', '12:30'),
  (3, 'B', 'Matemáticas', 'ricardo.penagos@escuela.mx', 'miercoles', '08:00', '09:00'),
  (3, 'B', 'Español', 'ricardo.penagos@escuela.mx', 'miercoles', '09:00', '10:00'),
  (3, 'B', 'Geografía', 'ricardo.penagos@escuela.mx', 'miercoles', '10:30', '11:30'),
  (3, 'B', 'Inglés', 'karen.morales@escuela.mx', 'miercoles', '11:30', '12:30'),
  (3, 'B', 'Matemáticas', 'ricardo.penagos@escuela.mx', 'jueves', '08:00', '09:00'),
  (3, 'B', 'Español', 'ricardo.penagos@escuela.mx', 'jueves', '09:00', '10:00'),
  (3, 'B', 'Ciencias Naturales', 'ricardo.penagos@escuela.mx', 'jueves', '10:30', '11:30'),
  (3, 'B', 'Educación Física', 'marco.ozuna@escuela.mx', 'jueves', '11:30', '12:30'),
  (3, 'B', 'Matemáticas', 'ricardo.penagos@escuela.mx', 'viernes', '08:00', '09:00'),
  (3, 'B', 'Español', 'ricardo.penagos@escuela.mx', 'viernes', '09:00', '10:00'),
  (3, 'B', 'Formación Cívica y Ética', 'ricardo.penagos@escuela.mx', 'viernes', '10:30', '11:30'),
  (3, 'B', 'Artes', 'ricardo.penagos@escuela.mx', 'viernes', '11:30', '12:30'),
  (4, 'A', 'Español', 'maria.docente@escuela.mx', 'lunes', '08:00', '09:00'),
  (4, 'A', 'Matemáticas', 'maria.docente@escuela.mx', 'lunes', '09:00', '10:00'),
  (4, 'A', 'Educación Física', 'daniela.camacho@escuela.mx', 'lunes', '10:30', '11:30'),
  (4, 'A', 'Matemáticas', 'maria.docente@escuela.mx', 'lunes', '11:30', '12:30'),
  (4, 'A', 'Español', 'maria.docente@escuela.mx', 'martes', '08:00', '09:00'),
  (4, 'A', 'Matemáticas', 'maria.docente@escuela.mx', 'martes', '09:00', '10:00'),
  (4, 'A', 'Ciencias Naturales', 'maria.docente@escuela.mx', 'martes', '10:30', '11:30'),
  (4, 'A', 'Historia', 'maria.docente@escuela.mx', 'martes', '11:30', '12:30'),
  (4, 'A', 'Español', 'maria.docente@escuela.mx', 'miercoles', '08:00', '09:00'),
  (4, 'A', 'Matemáticas', 'maria.docente@escuela.mx', 'miercoles', '09:00', '10:00'),
  (4, 'A', 'Artes', 'maria.docente@escuela.mx', 'miercoles', '10:30', '11:30'),
  (4, 'A', 'Geografía', 'maria.docente@escuela.mx', 'miercoles', '11:30', '12:30'),
  (4, 'A', 'Inglés', 'karen.morales@escuela.mx', 'jueves', '08:00', '09:00'),
  (4, 'A', 'Español', 'maria.docente@escuela.mx', 'jueves', '09:00', '10:00'),
  (4, 'A', 'Educación Física', 'daniela.camacho@escuela.mx', 'jueves', '10:30', '11:30'),
  (4, 'A', 'Ciencias Naturales', 'maria.docente@escuela.mx', 'jueves', '11:30', '12:30'),
  (4, 'A', 'Matemáticas', 'maria.docente@escuela.mx', 'viernes', '08:00', '09:00'),
  (4, 'A', 'Español', 'maria.docente@escuela.mx', 'viernes', '09:00', '10:00'),
  (4, 'A', 'Formación Cívica y Ética', 'maria.docente@escuela.mx', 'viernes', '10:30', '11:30'),
  (4, 'A', 'Artes', 'maria.docente@escuela.mx', 'viernes', '11:30', '12:30'),
  (4, 'B', 'Español', 'gabriela.castillejos@escuela.mx', 'lunes', '08:00', '09:00'),
  (4, 'B', 'Matemáticas', 'gabriela.castillejos@escuela.mx', 'lunes', '09:00', '10:00'),
  (4, 'B', 'Matemáticas', 'gabriela.castillejos@escuela.mx', 'lunes', '10:30', '11:30'),
  (4, 'B', 'Educación Física', 'daniela.camacho@escuela.mx', 'lunes', '11:30', '12:30'),
  (4, 'B', 'Español', 'gabriela.castillejos@escuela.mx', 'martes', '08:00', '09:00'),
  (4, 'B', 'Matemáticas', 'gabriela.castillejos@escuela.mx', 'martes', '09:00', '10:00'),
  (4, 'B', 'Ciencias Naturales', 'gabriela.castillejos@escuela.mx', 'martes', '10:30', '11:30'),
  (4, 'B', 'Historia', 'gabriela.castillejos@escuela.mx', 'martes', '11:30', '12:30'),
  (4, 'B', 'Español', 'gabriela.castillejos@escuela.mx', 'miercoles', '08:00', '09:00'),
  (4, 'B', 'Matemáticas', 'gabriela.castillejos@escuela.mx', 'miercoles', '09:00', '10:00'),
  (4, 'B', 'Artes', 'gabriela.castillejos@escuela.mx', 'miercoles', '10:30', '11:30'),
  (4, 'B', 'Geografía', 'gabriela.castillejos@escuela.mx', 'miercoles', '11:30', '12:30'),
  (4, 'B', 'Español', 'gabriela.castillejos@escuela.mx', 'jueves', '08:00', '09:00'),
  (4, 'B', 'Inglés', 'karen.morales@escuela.mx', 'jueves', '09:00', '10:00'),
  (4, 'B', 'Ciencias Naturales', 'gabriela.castillejos@escuela.mx', 'jueves', '10:30', '11:30'),
  (4, 'B', 'Educación Física', 'daniela.camacho@escuela.mx', 'jueves', '11:30', '12:30'),
  (4, 'B', 'Matemáticas', 'gabriela.castillejos@escuela.mx', 'viernes', '08:00', '09:00'),
  (4, 'B', 'Español', 'gabriela.castillejos@escuela.mx', 'viernes', '09:00', '10:00'),
  (4, 'B', 'Formación Cívica y Ética', 'gabriela.castillejos@escuela.mx', 'viernes', '10:30', '11:30'),
  (4, 'B', 'Artes', 'gabriela.castillejos@escuela.mx', 'viernes', '11:30', '12:30'),
  (5, 'A', 'Español', 'fernando.dominguez@escuela.mx', 'lunes', '08:00', '09:00'),
  (5, 'A', 'Matemáticas', 'fernando.dominguez@escuela.mx', 'lunes', '09:00', '10:00'),
  (5, 'A', 'Español', 'fernando.dominguez@escuela.mx', 'lunes', '10:30', '11:30'),
  (5, 'A', 'Matemáticas', 'fernando.dominguez@escuela.mx', 'lunes', '11:30', '12:30'),
  (5, 'A', 'Educación Física', 'daniela.camacho@escuela.mx', 'martes', '08:00', '09:00'),
  (5, 'A', 'Español', 'fernando.dominguez@escuela.mx', 'martes', '09:00', '10:00'),
  (5, 'A', 'Ciencias Naturales', 'fernando.dominguez@escuela.mx', 'martes', '10:30', '11:30'),
  (5, 'A', 'Historia', 'fernando.dominguez@escuela.mx', 'martes', '11:30', '12:30'),
  (5, 'A', 'Matemáticas', 'fernando.dominguez@escuela.mx', 'miercoles', '08:00', '09:00'),
  (5, 'A', 'Español', 'fernando.dominguez@escuela.mx', 'miercoles', '09:00', '10:00'),
  (5, 'A', 'Artes', 'fernando.dominguez@escuela.mx', 'miercoles', '10:30', '11:30'),
  (5, 'A', 'Geografía', 'fernando.dominguez@escuela.mx', 'miercoles', '11:30', '12:30'),
  (5, 'A', 'Matemáticas', 'fernando.dominguez@escuela.mx', 'jueves', '08:00', '09:00'),
  (5, 'A', 'Español', 'fernando.dominguez@escuela.mx', 'jueves', '09:00', '10:00'),
  (5, 'A', 'Inglés', 'karen.morales@escuela.mx', 'jueves', '10:30', '11:30'),
  (5, 'A', 'Ciencias Naturales', 'fernando.dominguez@escuela.mx', 'jueves', '11:30', '12:30'),
  (5, 'A', 'Educación Física', 'daniela.camacho@escuela.mx', 'viernes', '08:00', '09:00'),
  (5, 'A', 'Matemáticas', 'fernando.dominguez@escuela.mx', 'viernes', '09:00', '10:00'),
  (5, 'A', 'Formación Cívica y Ética', 'fernando.dominguez@escuela.mx', 'viernes', '10:30', '11:30'),
  (5, 'A', 'Artes', 'fernando.dominguez@escuela.mx', 'viernes', '11:30', '12:30'),
  (5, 'B', 'Español', 'laura.velazquez@escuela.mx', 'lunes', '08:00', '09:00'),
  (5, 'B', 'Matemáticas', 'laura.velazquez@escuela.mx', 'lunes', '09:00', '10:00'),
  (5, 'B', 'Español', 'laura.velazquez@escuela.mx', 'lunes', '10:30', '11:30'),
  (5, 'B', 'Matemáticas', 'laura.velazquez@escuela.mx', 'lunes', '11:30', '12:30'),
  (5, 'B', 'Español', 'laura.velazquez@escuela.mx', 'martes', '08:00', '09:00'),
  (5, 'B', 'Educación Física', 'daniela.camacho@escuela.mx', 'martes', '09:00', '10:00'),
  (5, 'B', 'Ciencias Naturales', 'laura.velazquez@escuela.mx', 'martes', '10:30', '11:30'),
  (5, 'B', 'Historia', 'laura.velazquez@escuela.mx', 'martes', '11:30', '12:30'),
  (5, 'B', 'Matemáticas', 'laura.velazquez@escuela.mx', 'miercoles', '08:00', '09:00'),
  (5, 'B', 'Español', 'laura.velazquez@escuela.mx', 'miercoles', '09:00', '10:00'),
  (5, 'B', 'Artes', 'laura.velazquez@escuela.mx', 'miercoles', '10:30', '11:30'),
  (5, 'B', 'Geografía', 'laura.velazquez@escuela.mx', 'miercoles', '11:30', '12:30'),
  (5, 'B', 'Matemáticas', 'laura.velazquez@escuela.mx', 'jueves', '08:00', '09:00'),
  (5, 'B', 'Español', 'laura.velazquez@escuela.mx', 'jueves', '09:00', '10:00'),
  (5, 'B', 'Ciencias Naturales', 'laura.velazquez@escuela.mx', 'jueves', '10:30', '11:30'),
  (5, 'B', 'Inglés', 'karen.morales@escuela.mx', 'jueves', '11:30', '12:30'),
  (5, 'B', 'Matemáticas', 'laura.velazquez@escuela.mx', 'viernes', '08:00', '09:00'),
  (5, 'B', 'Educación Física', 'daniela.camacho@escuela.mx', 'viernes', '09:00', '10:00'),
  (5, 'B', 'Formación Cívica y Ética', 'laura.velazquez@escuela.mx', 'viernes', '10:30', '11:30'),
  (5, 'B', 'Artes', 'laura.velazquez@escuela.mx', 'viernes', '11:30', '12:30'),
  (6, 'A', 'Español', 'arturo.trujillo@escuela.mx', 'lunes', '08:00', '09:00'),
  (6, 'A', 'Matemáticas', 'arturo.trujillo@escuela.mx', 'lunes', '09:00', '10:00'),
  (6, 'A', 'Matemáticas', 'arturo.trujillo@escuela.mx', 'lunes', '10:30', '11:30'),
  (6, 'A', 'Ciencias Naturales', 'arturo.trujillo@escuela.mx', 'lunes', '11:30', '12:30'),
  (6, 'A', 'Español', 'arturo.trujillo@escuela.mx', 'martes', '08:00', '09:00'),
  (6, 'A', 'Matemáticas', 'arturo.trujillo@escuela.mx', 'martes', '09:00', '10:00'),
  (6, 'A', 'Educación Física', 'daniela.camacho@escuela.mx', 'martes', '10:30', '11:30'),
  (6, 'A', 'Historia', 'arturo.trujillo@escuela.mx', 'martes', '11:30', '12:30'),
  (6, 'A', 'Español', 'arturo.trujillo@escuela.mx', 'miercoles', '08:00', '09:00'),
  (6, 'A', 'Matemáticas', 'arturo.trujillo@escuela.mx', 'miercoles', '09:00', '10:00'),
  (6, 'A', 'Artes', 'arturo.trujillo@escuela.mx', 'miercoles', '10:30', '11:30'),
  (6, 'A', 'Geografía', 'arturo.trujillo@escuela.mx', 'miercoles', '11:30', '12:30'),
  (6, 'A', 'Español', 'arturo.trujillo@escuela.mx', 'jueves', '08:00', '09:00'),
  (6, 'A', 'Matemáticas', 'arturo.trujillo@escuela.mx', 'jueves', '09:00', '10:00'),
  (6, 'A', 'Ciencias Naturales', 'arturo.trujillo@escuela.mx', 'jueves', '10:30', '11:30'),
  (6, 'A', 'Formación Cívica y Ética', 'arturo.trujillo@escuela.mx', 'jueves', '11:30', '12:30'),
  (6, 'A', 'Inglés', 'karen.morales@escuela.mx', 'viernes', '08:00', '09:00'),
  (6, 'A', 'Español', 'arturo.trujillo@escuela.mx', 'viernes', '09:00', '10:00'),
  (6, 'A', 'Educación Física', 'daniela.camacho@escuela.mx', 'viernes', '10:30', '11:30'),
  (6, 'A', 'Artes', 'arturo.trujillo@escuela.mx', 'viernes', '11:30', '12:30'),
  (6, 'B', 'Español', 'silvia.espinosa@escuela.mx', 'lunes', '08:00', '09:00'),
  (6, 'B', 'Matemáticas', 'silvia.espinosa@escuela.mx', 'lunes', '09:00', '10:00'),
  (6, 'B', 'Matemáticas', 'silvia.espinosa@escuela.mx', 'lunes', '10:30', '11:30'),
  (6, 'B', 'Ciencias Naturales', 'silvia.espinosa@escuela.mx', 'lunes', '11:30', '12:30'),
  (6, 'B', 'Español', 'silvia.espinosa@escuela.mx', 'martes', '08:00', '09:00'),
  (6, 'B', 'Matemáticas', 'silvia.espinosa@escuela.mx', 'martes', '09:00', '10:00'),
  (6, 'B', 'Historia', 'silvia.espinosa@escuela.mx', 'martes', '10:30', '11:30'),
  (6, 'B', 'Educación Física', 'daniela.camacho@escuela.mx', 'martes', '11:30', '12:30'),
  (6, 'B', 'Español', 'silvia.espinosa@escuela.mx', 'miercoles', '08:00', '09:00'),
  (6, 'B', 'Matemáticas', 'silvia.espinosa@escuela.mx', 'miercoles', '09:00', '10:00'),
  (6, 'B', 'Artes', 'silvia.espinosa@escuela.mx', 'miercoles', '10:30', '11:30'),
  (6, 'B', 'Geografía', 'silvia.espinosa@escuela.mx', 'miercoles', '11:30', '12:30'),
  (6, 'B', 'Español', 'silvia.espinosa@escuela.mx', 'jueves', '08:00', '09:00'),
  (6, 'B', 'Matemáticas', 'silvia.espinosa@escuela.mx', 'jueves', '09:00', '10:00'),
  (6, 'B', 'Ciencias Naturales', 'silvia.espinosa@escuela.mx', 'jueves', '10:30', '11:30'),
  (6, 'B', 'Formación Cívica y Ética', 'silvia.espinosa@escuela.mx', 'jueves', '11:30', '12:30'),
  (6, 'B', 'Español', 'silvia.espinosa@escuela.mx', 'viernes', '08:00', '09:00'),
  (6, 'B', 'Inglés', 'karen.morales@escuela.mx', 'viernes', '09:00', '10:00'),
  (6, 'B', 'Artes', 'silvia.espinosa@escuela.mx', 'viernes', '10:30', '11:30'),
  (6, 'B', 'Educación Física', 'daniela.camacho@escuela.mx', 'viernes', '11:30', '12:30');

INSERT INTO horarios (grupo_id, materia_id, docente_id, dia, hora_inicio, hora_fin)
SELECT g.id, m.id, u.id, n.dia::dia_semana, n.ini, n.fin
  FROM nuevo_horario n
  JOIN grupos g   ON g.escuela_id = '11111111-1111-1111-1111-111111111111' AND g.grado = n.grado AND g.letra = n.letra AND g.ciclo = '2026-2027'
  JOIN materias m ON m.escuela_id = '11111111-1111-1111-1111-111111111111' AND m.nombre = n.materia
  JOIN usuarios u ON u.email = n.email
 WHERE NOT EXISTS (SELECT 1 FROM horarios h WHERE h.grupo_id = g.id AND h.dia = n.dia::dia_semana AND h.hora_inicio = n.ini);

-- 6) Asistencia: días hábiles desde el 31 de agosto hasta ayer (sin el 16 de septiembre).
--    Cumplidos ~2% de faltas, regulares ~6%, irregulares ~25%. Unos pocos irregulares
--    llevan las últimas 3 clases sin venir (para que el sistema los detecte).
INSERT INTO asistencias (alumno_id, docente_id, fecha, estado, dispositivo_id)
SELECT a.id, g.docente_id, d::date,
       (CASE
          WHEN n.perfil = 'irregular' AND pg_temp.azar(a.id::text) < 0.4
               AND d::date IN (SELECT x::date FROM generate_series(CURRENT_DATE - 10, CURRENT_DATE - 1, '1 day') x
                                WHERE extract(isodow FROM x) < 6 ORDER BY x DESC LIMIT 3)
            THEN 'falta'
          WHEN r < CASE n.perfil WHEN 'irregular' THEN 0.25 WHEN 'regular' THEN 0.04 WHEN 'bajo' THEN 0.08 ELSE 0.02 END THEN 'falta'
          WHEN r > 0.985 THEN 'justificada'
          WHEN r > 0.95  THEN 'retardo'
          ELSE 'presente'
        END)::estado_asistencia,
       'tablet-' || g.grado || g.letra
  FROM alumnos a
  JOIN grupos g ON g.id = a.grupo_id
  LEFT JOIN nuevos_alumnos n ON n.id = a.id
  CROSS JOIN generate_series(DATE '2026-08-31', CURRENT_DATE - 1, '1 day') d
  CROSS JOIN LATERAL (SELECT pg_temp.azar(a.id::text || d::date::text) AS r) z
 WHERE g.escuela_id = '11111111-1111-1111-1111-111111111111' AND a.activo AND g.docente_id IS NOT NULL
   AND extract(isodow FROM d) < 6 AND d::date <> DATE '2026-09-16'
ON CONFLICT (alumno_id, fecha) DO NOTHING;

-- 7) Calificaciones del 1er parcial, todas las materias. Cada alumno tiene su "nivel"
--    y cada materia varía un poco; los de perfil bajo quedan alrededor de 5.5.
INSERT INTO calificaciones (alumno_id, materia_id, docente_id, parcial, calificacion)
SELECT n.id, m.id, coalesce(h.docente_id, g.docente_id), 1,
       least(10, greatest(5, round((
           CASE n.perfil WHEN 'bajo' THEN 5.2 WHEN 'irregular' THEN 6.4 ELSE 7.0 + 2.6 * pg_temp.azar(n.id::text || 'nivel') END
           + 1.6 * pg_temp.azar(n.id::text || m.nombre) - 0.6)::numeric * 2) / 2))
  FROM nuevos_alumnos n
  JOIN alumnos a  ON a.id = n.id
  JOIN grupos g   ON g.id = a.grupo_id
  JOIN materias m ON m.escuela_id = g.escuela_id
  LEFT JOIN LATERAL (SELECT docente_id FROM horarios WHERE grupo_id = g.id AND materia_id = m.id LIMIT 1) h ON TRUE
 WHERE m.nombre IN ('Español','Matemáticas','Ciencias Naturales','Historia','Geografía',
                    'Formación Cívica y Ética','Artes','Educación Física','Inglés')
ON CONFLICT DO NOTHING;

-- 8) Alertas de rezago con las reglas de siempre. Las de este historial se marcan como ya
--    avisadas para que el bot de Telegram no mande decenas de mensajes de golpe.
SELECT fn_generar_alertas() AS alertas_nuevas;
UPDATE alertas_rezago SET enviada = TRUE, enviada_at = NOW()
 WHERE NOT enviada AND alumno_id IN (SELECT id FROM nuevos_alumnos);

COMMIT;

-- Resumen
SELECT (SELECT count(*) FROM grupos)                         AS grupos,
       (SELECT count(*) FROM usuarios WHERE rol = 'docente') AS docentes,
       (SELECT count(*) FROM alumnos WHERE activo)           AS alumnos,
       (SELECT count(*) FROM horarios)                       AS clases_semana,
       (SELECT count(*) FROM asistencias)                    AS asistencias,
       (SELECT count(*) FROM calificaciones)                 AS calificaciones,
       (SELECT count(*) FROM alertas_rezago WHERE NOT atendida) AS alertas_abiertas;
