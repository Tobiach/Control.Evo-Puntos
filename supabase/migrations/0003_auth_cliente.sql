-- Control.Evo — vínculo de cuenta de cliente (email real) con su fila de `clientes` (teléfono)
-- El teléfono sigue siendo el documento único del sistema (lo usa el cajero sin auth), pero
-- el login del cliente final pasa a ser email+contraseña (el proveedor de teléfono de Supabase
-- Auth está deshabilitado y requeriría un proveedor SMS de pago). Esta función resuelve el
-- vínculo: si el cajero ya cobró antes a ese teléfono, la cuenta nueva reclama esa fila en vez
-- de crear un cliente duplicado. SECURITY DEFINER porque la policy de UPDATE de `clientes`
-- exige auth.uid() = user_id, y acá el user_id todavía es NULL la primera vez.

CREATE OR REPLACE FUNCTION vincular_cliente(p_telefono TEXT, p_nombre TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'no_autenticado';
  END IF;

  -- Login repetido: esta cuenta ya tiene cliente vinculado.
  SELECT id INTO v_cliente_id FROM clientes WHERE user_id = auth.uid();
  IF v_cliente_id IS NOT NULL THEN
    RETURN v_cliente_id;
  END IF;

  -- El cajero ya cobró antes a este teléfono: reclamar esa fila, no duplicar.
  SELECT id INTO v_cliente_id FROM clientes WHERE telefono = p_telefono AND user_id IS NULL;
  IF v_cliente_id IS NOT NULL THEN
    UPDATE clientes
    SET user_id = auth.uid(), nombre = COALESCE(NULLIF(p_nombre, ''), nombre)
    WHERE id = v_cliente_id;
    RETURN v_cliente_id;
  END IF;

  -- Primera vez de este teléfono en todo el sistema.
  INSERT INTO clientes (user_id, nombre, telefono)
  VALUES (auth.uid(), NULLIF(p_nombre, ''), p_telefono)
  RETURNING id INTO v_cliente_id;
  RETURN v_cliente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION vincular_cliente(TEXT, TEXT) TO authenticated;
