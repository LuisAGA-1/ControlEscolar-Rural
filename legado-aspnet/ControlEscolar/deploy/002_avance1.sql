-- Avance 1: ajustes sobre la base existente (seguro de correr varias veces).
-- Pone la contraseña "docente123" a los usuarios de prueba para poder iniciar sesión.
UPDATE usuarios
   SET password_hash = '$2b$10$ddOwY/dNyOug1IoYrSU/X.3zYT/ikh6xLdw6V0A7UTmPoU5cW.Tb6'
 WHERE email IN ('maria.docente@escuela.mx', 'director@escuela.mx');
