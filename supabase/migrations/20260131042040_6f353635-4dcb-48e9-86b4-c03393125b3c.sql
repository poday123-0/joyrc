-- Grant INSERT permission on contact_messages to anon role
GRANT INSERT ON public.contact_messages TO anon;
GRANT SELECT ON public.contact_messages TO anon;
GRANT USAGE ON SCHEMA public TO anon;