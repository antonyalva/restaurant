-- Script to promote a user to Admin role
-- Run this in the Supabase SQL Editor AFTER signing up with the email

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'antonyadrian.12@gmail.com';

-- Verify the change
SELECT email, role FROM public.profiles WHERE email = 'antonyadrian.12@gmail.com';
