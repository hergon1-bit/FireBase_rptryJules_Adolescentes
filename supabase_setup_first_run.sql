CREATE OR REPLACE FUNCTION public.is_first_run()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT count(*) INTO user_count FROM public.usuarios;
  RETURN user_count = 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.setup_first_admin(admin_id uuid, admin_name text, admin_email text, admin_rol_id int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count integer;
BEGIN
  SELECT count(*) INTO user_count FROM public.usuarios;
  IF user_count > 0 THEN
    RAISE EXCEPTION 'Admin already exists';
  END IF;

  -- Insert default roles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE id = 1) THEN
    INSERT INTO public.roles (id, nombre, permisos) VALUES
    (1, 'Administrador', '{"adolescentes": {"read": true, "create": true, "update": true, "delete": true}, "asistencias": {"read": true, "create": true, "update": true, "delete": true}, "celebraciones_cumpleanos": {"read": true, "create": true, "update": true, "delete": true}, "devocionales": {"read": true, "create": true, "update": true, "delete": true}, "encargados": {"read": true, "create": true, "update": true, "delete": true}, "entregas_devocionales": {"read": true, "create": true, "update": true, "delete": true}, "eventos": {"read": true, "create": true, "update": true, "delete": true}, "inscripciones_eventos": {"read": true, "create": true, "update": true, "delete": true}, "inscripciones_servidores": {"read": true, "create": true, "update": true, "delete": true}, "pagos_eventos": {"read": true, "create": true, "update": true, "delete": true}, "pagos_servidores": {"read": true, "create": true, "update": true, "delete": true}, "participantes_eventos": {"read": true, "create": true, "update": true, "delete": true}, "reuniones": {"read": true, "create": true, "update": true, "delete": true}, "roles": {"read": true, "create": true, "update": true, "delete": true}, "servidores": {"read": true, "create": true, "update": true, "delete": true}, "tutor_adolescente": {"read": true, "create": true, "update": true, "delete": true}, "tutores": {"read": true, "create": true, "update": true, "delete": true}, "usuarios": {"read": true, "create": true, "update": true, "delete": true}}'::jsonb),
    (2, 'Encargado', '{"adolescentes": {"read": true, "create": true, "update": true, "delete": true}, "asistencias": {"read": true, "create": true, "update": true, "delete": true}, "celebraciones_cumpleanos": {"read": true, "create": false, "update": false, "delete": false}, "devocionales": {"read": true, "create": false, "update": false, "delete": false}, "encargados": {"read": true, "create": false, "update": false, "delete": false}, "entregas_devocionales": {"read": true, "create": true, "update": true, "delete": true}, "eventos": {"read": true, "create": false, "update": false, "delete": false}, "inscripciones_eventos": {"read": true, "create": true, "update": true, "delete": true}, "inscripciones_servidores": {"read": true, "create": true, "update": true, "delete": true}, "pagos_eventos": {"read": true, "create": true, "update": true, "delete": true}, "pagos_servidores": {"read": true, "create": true, "update": true, "delete": true}, "participantes_eventos": {"read": true, "create": true, "update": true, "delete": true}, "reuniones": {"read": true, "create": true, "update": true, "delete": true}, "roles": {"read": true, "create": false, "update": false, "delete": false}, "servidores": {"read": true, "create": true, "update": true, "delete": true}, "tutor_adolescente": {"read": true, "create": true, "update": true, "delete": true}, "tutores": {"read": true, "create": true, "update": true, "delete": true}, "usuarios": {"read": true, "create": false, "update": false, "delete": false}}'::jsonb);
  END IF;

  -- Insert user
  INSERT INTO public.usuarios (id, nombre, email, rol_id)
  VALUES (admin_id, admin_name, admin_email, admin_rol_id);

  RETURN true;
END;
$$;
