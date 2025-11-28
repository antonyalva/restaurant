-- Script to create a new Cashier user
-- Run this in the Supabase SQL Editor

-- 1. Enable pgcrypto extension if not already enabled (for password hashing)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create the user in auth.users
DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    user_email TEXT := 'antonyadrian.12@gmail.com';
    user_password TEXT := '123456'; -- Default password
BEGIN
    -- Check if user already exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = user_email) THEN
        
        -- Insert into auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            user_email,
            crypt(user_password, gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );

        -- Insert into public.profiles
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (new_user_id, user_email, 'Antony Adrian', 'cashier');

        RAISE NOTICE 'Usuario cajero creado exitosamente: %', user_email;
    ELSE
        RAISE NOTICE 'El usuario % ya existe', user_email;
    END IF;
END $$;
