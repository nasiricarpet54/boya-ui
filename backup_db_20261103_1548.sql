--
-- PostgreSQL database dump
--

\restrict Te2Law1q0eC0bQpNM8OxKur5haadHyUGItO4GbGCRvSO7TDqvqcILwmNlathpbP

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: beauty
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'rescheduled'
);


ALTER TYPE public.booking_status OWNER TO beauty;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: beauty
--

CREATE TYPE public.payment_status AS ENUM (
    'unpaid',
    'deposit_paid',
    'fully_paid',
    'refunded'
);


ALTER TYPE public.payment_status OWNER TO beauty;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: beauty
--

CREATE TYPE public.user_role AS ENUM (
    'customer',
    'salon_specialist',
    'mobile_specialist',
    'line_manager',
    'salon_admin',
    'super_admin'
);


ALTER TYPE public.user_role OWNER TO beauty;

--
-- Name: user_status; Type: TYPE; Schema: public; Owner: beauty
--

CREATE TYPE public.user_status AS ENUM (
    'active',
    'suspended'
);


ALTER TYPE public.user_status OWNER TO beauty;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_profile; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.admin_profile (
    id integer NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    emergency_phone text,
    position_title text,
    admin_code text,
    avatar_url text,
    bio text,
    province text,
    city text,
    security_alert_sms boolean DEFAULT true NOT NULL,
    new_salons_notify_sms boolean DEFAULT true NOT NULL,
    weekly_reports_email boolean DEFAULT true NOT NULL,
    two_factor_enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.admin_profile OWNER TO beauty;

--
-- Name: admin_profile_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.admin_profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_profile_id_seq OWNER TO beauty;

--
-- Name: admin_profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.admin_profile_id_seq OWNED BY public.admin_profile.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    actor_id integer,
    target_id text,
    action text NOT NULL,
    details text,
    ip_address text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO beauty;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO beauty;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    salon_id integer NOT NULL,
    service_id integer NOT NULL,
    specialist_id integer NOT NULL,
    date text NOT NULL,
    "time" text NOT NULL,
    status public.booking_status DEFAULT 'pending'::public.booking_status NOT NULL,
    payment_status public.payment_status DEFAULT 'unpaid'::public.payment_status NOT NULL,
    is_mobile_booking boolean DEFAULT false NOT NULL,
    customer_address text,
    notes text,
    tracking_code text NOT NULL,
    price numeric(12,0) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bookings OWNER TO beauty;

--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bookings_id_seq OWNER TO beauty;

--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type text NOT NULL,
    target_audience text NOT NULL,
    channel text NOT NULL,
    action_url text,
    action_text text,
    badge_text text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone,
    views_count integer DEFAULT 0 NOT NULL,
    clicks_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.notifications OWNER TO beauty;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO beauty;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: portfolio_items; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.portfolio_items (
    id integer NOT NULL,
    specialist_id integer NOT NULL,
    title text NOT NULL,
    "imageUrl" text NOT NULL,
    category text NOT NULL,
    likes_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.portfolio_items OWNER TO beauty;

--
-- Name: portfolio_items_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.portfolio_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.portfolio_items_id_seq OWNER TO beauty;

--
-- Name: portfolio_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.portfolio_items_id_seq OWNED BY public.portfolio_items.id;


--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.revoked_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    revoked_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL
);


ALTER TABLE public.revoked_tokens OWNER TO beauty;

--
-- Name: revoked_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.revoked_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.revoked_tokens_id_seq OWNER TO beauty;

--
-- Name: revoked_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.revoked_tokens_id_seq OWNED BY public.revoked_tokens.id;


--
-- Name: salons; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.salons (
    id integer NOT NULL,
    tenant_id text NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    phone text NOT NULL,
    province text NOT NULL,
    city text NOT NULL,
    district text NOT NULL,
    latitude numeric(10,7),
    longitude numeric(10,7),
    rating numeric(3,2) DEFAULT 5.00 NOT NULL,
    reviews_count integer DEFAULT 0 NOT NULL,
    is_approved boolean DEFAULT false NOT NULL,
    is_vip boolean DEFAULT false NOT NULL,
    vip_badge_label text,
    is_mobile_service_active boolean DEFAULT false NOT NULL,
    cover_image text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    gallery text
);


ALTER TABLE public.salons OWNER TO beauty;

--
-- Name: salons_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.salons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salons_id_seq OWNER TO beauty;

--
-- Name: salons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.salons_id_seq OWNED BY public.salons.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.services (
    id integer NOT NULL,
    salon_id integer NOT NULL,
    service_line_id text NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(12,0) NOT NULL,
    duration_minutes integer NOT NULL,
    is_mobile_available boolean DEFAULT false NOT NULL,
    image_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.services OWNER TO beauty;

--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_seq OWNER TO beauty;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: specialists; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.specialists (
    id integer NOT NULL,
    user_id integer NOT NULL,
    salon_id integer NOT NULL,
    specialty_line text NOT NULL,
    bio text,
    experience_years integer DEFAULT 0 NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    is_mobile_active boolean DEFAULT false NOT NULL,
    avatar_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.specialists OWNER TO beauty;

--
-- Name: specialists_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.specialists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.specialists_id_seq OWNER TO beauty;

--
-- Name: specialists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.specialists_id_seq OWNED BY public.specialists.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    amount numeric(12,0) NOT NULL,
    gateway_reference text,
    status text NOT NULL,
    type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.transactions OWNER TO beauty;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO beauty;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: beauty
--

CREATE TABLE public.users (
    id integer NOT NULL,
    uid text NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    role public.user_role DEFAULT 'customer'::public.user_role NOT NULL,
    salon_id integer,
    managed_line text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    status public.user_status DEFAULT 'active'::public.user_status NOT NULL,
    avatar text
);


ALTER TABLE public.users OWNER TO beauty;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: beauty
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO beauty;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: beauty
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: admin_profile id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.admin_profile ALTER COLUMN id SET DEFAULT nextval('public.admin_profile_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: portfolio_items id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.portfolio_items ALTER COLUMN id SET DEFAULT nextval('public.portfolio_items_id_seq'::regclass);


--
-- Name: revoked_tokens id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.revoked_tokens ALTER COLUMN id SET DEFAULT nextval('public.revoked_tokens_id_seq'::regclass);


--
-- Name: salons id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.salons ALTER COLUMN id SET DEFAULT nextval('public.salons_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: specialists id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.specialists ALTER COLUMN id SET DEFAULT nextval('public.specialists_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: admin_profile; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.admin_profile (id, full_name, phone, email, emergency_phone, position_title, admin_code, avatar_url, bio, province, city, security_alert_sms, new_salons_notify_sms, weekly_reports_email, two_factor_enabled) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.audit_logs (id, actor_id, target_id, action, details, ip_address, created_at) FROM stdin;
1	1	\N	LOGIN	\N	::ffff:172.18.0.1	2026-11-02 08:45:59.494943
2	1	\N	LOGIN	\N	138.124.34.61	2026-11-02 08:47:44.492638
3	1	\N	LOGIN	\N	138.124.34.61	2026-11-02 08:48:57.783711
4	1	27	ROLE_CHANGE	{"from":"customer","to":"salon_admin"}	138.124.34.61	2026-11-02 09:24:55.914113
5	8	\N	LOGIN	\N	138.124.34.61	2026-11-02 09:25:58.088515
6	8	\N	LOGIN	\N	138.124.34.61	2026-11-02 09:27:13.660218
7	1	25	SUSPENSION	{"from":"active","to":"suspended"}	138.124.34.61	2026-11-02 09:28:00.472594
8	1	8	SUSPENSION	{"from":"active","to":"suspended"}	138.124.34.61	2026-11-02 09:28:34.275782
9	\N	8	UNAUTHORIZED_ACCESS	{"reason":"Suspended login attempt"}	138.124.34.61	2026-11-02 09:29:47.186236
10	1	8	SUSPENSION	{"from":"suspended","to":"active"}	138.124.34.61	2026-11-02 09:30:19.686663
11	1	8	ROLE_CHANGE	{"from":"customer","to":"salon_admin"}	138.124.34.61	2026-11-02 09:30:39.082919
12	1	27	SUSPENSION	{"from":"active","to":"suspended"}	138.124.34.61	2026-11-02 09:30:46.292128
13	8	\N	LOGIN	\N	138.124.34.61	2026-11-02 09:31:21.088516
14	8	\N	LOGIN	\N	138.124.34.61	2026-11-02 09:38:13.82901
15	8	\N	LOGIN	\N	138.124.34.61	2026-11-02 09:42:01.344144
16	1	27	DELETE_USER	{"name":"سحر حسینی"}	138.124.34.61	2026-11-02 09:54:24.316549
17	1	26	DELETE_USER	{"name":"کاربر 8877"}	138.124.34.61	2026-11-02 09:57:53.162337
18	1	25	SUSPENSION	{"from":"suspended","to":"active"}	138.124.34.61	2026-11-02 09:58:14.762735
19	1	5	SUSPENSION	{"from":"active","to":"suspended"}	138.124.34.61	2026-11-02 09:59:24.671938
20	1	7	ROLE_CHANGE	{"from":"customer","to":"salon_specialist"}	138.124.34.61	2026-11-02 10:00:10.68169
21	7	\N	LOGIN	\N	138.124.34.61	2026-11-02 10:01:15.652968
22	22	\N	LOGIN	\N	138.124.34.61	2026-11-02 10:14:06.785128
23	1	25	ROLE_CHANGE	{"from":"customer","to":"mobile_specialist"}	138.124.34.61	2026-11-02 10:16:06.251172
24	25	\N	LOGIN	\N	138.124.34.61	2026-11-02 10:17:03.506769
25	1	\N	LOGIN	\N	192.15.237.95	2026-11-02 12:15:11.880556
26	1	\N	LOGIN	\N	138.124.34.61	2026-11-02 14:08:31.853669
27	1	24	ROLE_CHANGE	{"from":"mobile_specialist","to":"salon_specialist"}	138.124.34.61	2026-11-02 14:44:52.775396
28	1	\N	LOGIN	\N	192.15.237.95	2026-11-02 17:36:56.747782
29	1	\N	LOGIN	\N	84.47.208.253	2026-11-03 06:41:44.040192
30	1	\N	LOGIN	\N	84.47.208.253	2026-11-03 08:04:53.101509
31	8	\N	LOGIN	\N	84.47.208.253	2026-11-03 08:07:26.101211
32	1	\N	LOGIN	\N	138.124.34.61	2026-11-03 14:26:27.14778
33	15	\N	LOGIN	\N	138.124.34.61	2026-11-03 14:29:02.144247
\.


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.bookings (id, customer_id, salon_id, service_id, specialist_id, date, "time", status, payment_status, is_mobile_booking, customer_address, notes, tracking_code, price, created_at) FROM stdin;
1	1	1	1	1	2026-11-11	۱۲:۳۰	pending	unpaid	f	\N	\N	BY-935903	3800000	2026-11-01 17:42:11.857264
2	25	1	1	1	2026-11-01	۱۱:۰۰	pending	unpaid	f	\N	\N	BY-162789	3800000	2026-11-01 19:05:05.864527
3	1	1	1	1	2026-11-12	۱۲:۰۰	pending	unpaid	f	\N	\N	BY-172608	3800000	2026-11-01 19:14:39.023974
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.notifications (id, title, content, type, target_audience, channel, action_url, action_text, badge_text, is_active, created_at, expires_at, views_count, clicks_count) FROM stdin;
\.


--
-- Data for Name: portfolio_items; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.portfolio_items (id, specialist_id, title, "imageUrl", category, likes_count, created_at) FROM stdin;
\.


--
-- Data for Name: revoked_tokens; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.revoked_tokens (id, token, revoked_at, expires_at) FROM stdin;
1	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidWlkIjoicGhvbmVfMDkxNDUxNTE0MzUiLCJwaG9uZSI6IjA5MTQ1MTUxNDM1Iiwicm9sZSI6InN1cGVyX2FkbWluIiwic2Fsb25JZCI6bnVsbCwiaWF0IjoxNzkzNjA5MjY0LCJleHAiOjE3OTYyMDEyNjR9.DIRWO1NHJHnu2lfgMcYp5KFSfy8biHG5zr8dUvbrPho	2026-11-02 08:48:03.174676	2026-12-02 08:48:03.172
2	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwidWlkIjoicGhvbmVfMDkxNDMxODk3MzQiLCJwaG9uZSI6IjA5MTQzMTg5NzM0Iiwicm9sZSI6ImN1c3RvbWVyIiwic2Fsb25JZCI6bnVsbCwiaWF0IjoxNzkzNjExNTU4LCJleHAiOjE3OTYyMDM1NTh9.UWfnJ09BHQhY_J8kIrsOQ_DGox1Vl5_DK8rjq3DUB-c	2026-11-02 09:26:27.435345	2026-12-02 09:26:27.419
3	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwidWlkIjoicGhvbmVfMDkxNDMxODk3MzQiLCJwaG9uZSI6IjA5MTQzMTg5NzM0Iiwicm9sZSI6InNhbG9uX2FkbWluIiwic2Fsb25JZCI6IjExIiwiaWF0IjoxNzkzNjExODgxLCJleHAiOjE3OTYyMDM4ODF9.4J-vtEgryiXxJ-0vEtXsfHn6b0LBiPCY1QdrAukMS1o	2026-11-02 09:37:23.420223	2026-12-02 09:37:23.417
4	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwidWlkIjoicGhvbmVfMDkxNDMxODk3MzQiLCJwaG9uZSI6IjA5MTQzMTg5NzM0Iiwicm9sZSI6InNhbG9uX2FkbWluIiwic2Fsb25JZCI6IjExIiwiaWF0IjoxNzkzNjEyMjkzLCJleHAiOjE3OTYyMDQyOTN9.YNIS02x4AcKN0Qt3TW8RxJaxVx6AmAEMcCae6TKqqUY	2026-11-02 10:00:40.588045	2026-12-02 10:00:40.57
5	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NywidWlkIjoicGhvbmVfMDkxNDk5OTk5OTkiLCJwaG9uZSI6IjA5MTQ5OTk5OTk5Iiwicm9sZSI6InNhbG9uX3NwZWNpYWxpc3QiLCJzYWxvbklkIjoiMTEiLCJpYXQiOjE3OTM2MTM2NzUsImV4cCI6MTc5NjIwNTY3NX0.C7Spssg7B_lOvx3fn4SFgcNtpxbasvSgXOGNotLhVXc	2026-11-02 10:12:21.820694	2026-12-02 10:12:21.806
6	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjIsInVpZCI6InBob25lXzA5MTE0NDQ3Nzg4IiwicGhvbmUiOiIwOTExNDQ0Nzc4OCIsInJvbGUiOiJtb2JpbGVfc3BlY2lhbGlzdCIsInNhbG9uSWQiOiI4IiwiaWF0IjoxNzkzNjE0NDQ2LCJleHAiOjE3OTYyMDY0NDZ9.2rIq2uLnsaDo41a32X1k-Ccnd6ZWAWUcupJxFa5b0X8	2026-11-02 10:16:31.826628	2026-12-02 10:16:31.825
7	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidWlkIjoicGhvbmVfMDkxNDUxNTE0MzUiLCJwaG9uZSI6IjA5MTQ1MTUxNDM1Iiwicm9sZSI6InN1cGVyX2FkbWluIiwic2Fsb25JZCI6bnVsbCwiaWF0IjoxNzkzNjA5MzM3LCJleHAiOjE3OTYyMDEzMzd9.DhO6Djm5hxcXLNdPygBuiBNwfHA8wkpwjEe6v72Fksg	2026-11-02 20:59:21.892511	2026-12-02 20:59:21.876
8	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidWlkIjoicGhvbmVfMDkxNDUxNTE0MzUiLCJwaG9uZSI6IjA5MTQ1MTUxNDM1Iiwicm9sZSI6InN1cGVyX2FkbWluIiwic2Fsb25JZCI6bnVsbCwiaWF0IjoxNzkzNjI4NTExLCJleHAiOjE3OTYyMjA1MTF9.4OEHJb2KQu0B3Q9cJKB3wBOowcj9Ykzhf0Z-WR-4Y0U	2026-11-03 06:40:55.616841	2026-12-03 06:40:55.614
9	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjUsInVpZCI6InBob25lXzA5MTQzMTg5NzM5IiwicGhvbmUiOiIwOTE0MzE4OTczOSIsInJvbGUiOiJtb2JpbGVfc3BlY2lhbGlzdCIsInNhbG9uSWQiOm51bGwsImlhdCI6MTc5MzYxNDYyMywiZXhwIjoxNzk2MjA2NjIzfQ.7okPuV4aLQuEWbnR4EGThZBj3sOZVnpLQodA7d40ZFU	2026-11-03 08:01:35.709321	2026-12-03 08:01:35.689
10	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwidWlkIjoicGhvbmVfMDkxNDMxODk3MzQiLCJwaG9uZSI6IjA5MTQzMTg5NzM0Iiwicm9sZSI6InNhbG9uX2FkbWluIiwic2Fsb25JZCI6IjExIiwiaWF0IjoxNzkzNjEyNTIxLCJleHAiOjE3OTYyMDQ1MjF9.Img-JApkrR59C_PC2W5RIFKiv44QYFFhm3oHOgu1uGo	2026-11-03 08:02:40.332791	2026-12-03 08:02:40.311
11	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidWlkIjoicGhvbmVfMDkxNDUxNTE0MzUiLCJwaG9uZSI6IjA5MTQ1MTUxNDM1Iiwicm9sZSI6InN1cGVyX2FkbWluIiwic2Fsb25JZCI6bnVsbCwiaWF0IjoxNzkzNjg4MTA0LCJleHAiOjE3OTYyODAxMDR9._ZrqfOi0alqLXYyUw-JmvIKxoI52AX9mWszyqFeuEig	2026-11-03 08:02:48.916644	2026-12-03 08:02:48.915
12	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidWlkIjoicGhvbmVfMDkxNDUxNTE0MzUiLCJwaG9uZSI6IjA5MTQ1MTUxNDM1Iiwicm9sZSI6InN1cGVyX2FkbWluIiwic2Fsb25JZCI6bnVsbCwiaWF0IjoxNzkzNjkzMDkzLCJleHAiOjE3OTYyODUwOTN9.wnsiMq4r1oWLQKY1-XRI_QNmQpgAfeyTZze7RcnzwBY	2026-11-03 14:25:25.796212	2026-12-03 14:25:25.78
13	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OCwidWlkIjoicGhvbmVfMDkxNDMxODk3MzQiLCJwaG9uZSI6IjA5MTQzMTg5NzM0Iiwicm9sZSI6InNhbG9uX2FkbWluIiwic2Fsb25JZCI6IjExIiwiaWF0IjoxNzkzNjkzMjQ2LCJleHAiOjE3OTYyODUyNDZ9.W7skV-I8hu2kbZI63LcsvE6F9UHYtzaMXtqK2pMXZP4	2026-11-03 14:28:15.929594	2026-12-03 14:28:15.928
\.


--
-- Data for Name: salons; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.salons (id, tenant_id, name, address, phone, province, city, district, latitude, longitude, rating, reviews_count, is_approved, is_vip, vip_badge_label, is_mobile_service_active, cover_image, created_at, gallery) FROM stdin;
1	tnt-tehran-elahiyeh-01	سالن زیبایی و عمارت گل سرخ	خیابان فرشته، بن‌بست نیلوفر، عمارت شماره ۱۲	۰۲۱-۲۲۰۰۵۵۴۴	تهران	تهران	الهیه	35.7951000	51.4239000	4.94	382	t	t	سالن برگزیده VIP	t	https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:48.813669	\N
2	tnt-tehran-zaferanieh-02	کلینیک و مرکز تخصصی پوست و لیزر صبا	خیابان مقدس اردبیلی، مجتمع تجاری پالادیوم، برج جنوبی، طبقه ۵	۰۲۱-۲۲۱۱۸۸۹۹	تهران	تهران	زعفرانیه	35.8012000	51.4178000	4.88	295	t	f	\N	f	https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:48.912327	\N
3	tnt-shiraz-ghasrodasht-03	عمارت و اسپا پرشیا پالاس	قصرالدشت، خیابان وکلا، کوچه گلستان، باغ اختصاصی پرشیا	۰۷۱-۳۶۲۲۴۴۰۰	فارس	شیراز	قصرالدشت	29.6293000	52.4938000	4.98	220	t	t	همکار طلایی بویا	t	https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:48.94427	\N
4	tnt-isfahan-mardavij-04	عمارت و استودیو زیبایی پرنسس اصفهان	خیابان مرداویج، ملاصدرا، پلاک ۲۴	۰۳۱-۳۶۶۶۷۷۸۸	اصفهان	اصفهان	مرداویج	32.6184000	51.6687000	4.89	112	t	f	\N	t	https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:48.975138	\N
5	tnt-mashhad-sajjad-05	عمارت بیوتی و اسپا دیاموند مشهد	بلوار سجاد، خیابان بهار، نبش بهار ۴، ساختمان دیاموند	۰۵۱-۳۷۶۵۴۳۲۱	خراسان رضوی	مشهد	سجاد	36.3155000	59.5624000	4.96	189	t	t	سالن برگزیده VIP مشهد	t	https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:49.008726	\N
6	tnt-tabriz-valiasr-06	سالن زیبایی و استودیو تخصصی الیزه تبریز	تبریز، کوی ولیعصر، خیابان مخابرات، بالاتر از فلکه رودکی، پلاک ۱۸	۰۴۱-۳۳۳۳۲۲۱۱	آذربایجان شرقی	تبریز	ولیعصر	38.0674000	46.3621000	4.93	146	t	t	سالن برگزیده VIP تبریز	t	https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:49.056423	\N
7	tnt-karaj-azimieh-07	عمارت زیبایی و کلینیک پوست رز گلد کرج	کرج، عظیمیه، میدان مهران، بلوار گلستان، پلاک ۵۶	۰۲۶-۳۲۵۴۷۷۸۸	البرز	کرج	عظیمیه	35.8452000	51.0182000	4.91	132	t	f	\N	t	https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:49.098129	\N
8	tnt-gilan-rasht-golsar-08	عمارت زیبایی و اسپا مانلی رشت	رشت، گلسار، بلوار سمیه، نبش خیابان ۱۲۶، عمارت مانلی	۰۱۳-۳۳۷۷۸۸۹۹	گیلان	رشت	گلسار	37.3012000	49.5935000	4.95	167	t	t	سالن برگزیده VIP گیلان	t	https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:49.129415	\N
9	tnt-khuzestan-ahvaz-kianpars-09	سالن زیبایی و آکادمی تخصصی اروند اهواز	اهواز، کیانپارس، خیابان ۱۳ شرقی، مجتمع پزشکی و زیبایی اروند، طبقه ۴	۰۶۱-۳۳۳۳۹۹۸۸	خوزستان	اهواز	کیانپارس	31.3485000	48.6832000	4.92	155	t	t	سالن برگزیده VIP اهواز	t	https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:49.166784	\N
10	tnt-tehran-saadatabad-10	استودیو بیوتی و لاین اکستنشن لوکس آوینا	تهران، سعادت‌آباد، میدان کاج، خیابان سرو شرقی، مجتمع رویال، طبقه ۳	۰۲۱-۲۲۰۸۹۹۰۰	تهران	تهران	سعادت‌آباد	35.7895000	51.3732000	4.97	275	t	t	سالن برگزیده VIP سعادت‌آباد	t	https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80	2026-11-01 17:33:49.195059	\N
11	tenant-7519-7246	بارانا	تبریز - شهرک ارم	09143189734	آذربایجان شرقی	تبریز	منطقه ۱	\N	\N	5.00	0	t	t	\N	f	https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80	2026-11-02 09:23:27.249375	["/uploads/img_1793631010843_0e13a8b0.webp","https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80"]
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.services (id, salon_id, service_line_id, name, description, price, duration_minutes, is_mobile_available, image_url, created_at) FROM stdin;
1	1	hair	کراتین و احیای پروتئینه نانو ابریشمی	صافی و احیای ۱۰۰٪ بدون فرمالدئید با روغن کندر و خاویار، مناسب موهای آسیب‌دیده	3800000	120	t	https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:48.834919
2	1	skincare	هیدرافیشیال کلینیکال و اکسیژن‌تراپی طلا	پاکسازی چندمرحله‌ای، تخلیه کمدون با اولتراسونیک، تزریق سرم زعفران و ماسک طلا	2600000	90	f	https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:48.847019
3	1	nail	کاشت ناخن با پودر روسی و ژلیش کهکشانی	فرم‌دهی طبیعی، مانیکور دقیق روسی با سرسوهان الماسه و لاک‌ژل شاین با ماندگاری بالا	1100000	90	t	https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:48.854268
4	1	eyelash_eyebrow	اکستنشن مژه اسپایکی و مگاوالیوم ابریشمی	تارهای فوق سبک بدون احساس سنگینی، چسب گیاهی ضدحساسیت و لیفت ملایم گوشه چشم	1450000	105	f	https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:48.861681
5	2	skincare	میکرونیدلینگ و مزوتراپی جوانسازی با کوکتل طلا	تحریک کلاژن‌سازی فیبروبلاست‌ها، رفع جای جوش و اسکار با دستگاه نیدلینگ پزشکی	2900000	60	f	https://images.unsplash.com/photo-1512290900672-1f486a42a033?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:48.920021
6	3	massage_spa	آیین حمام شاهانه ایرانی با اسکراب سفیدآب و کف گلاب	حمام بخار معطر، کیسه‌کشی ملایم سنتی با صابون مراغه، لیف کف گل سرخ قمصر و ماساژ سر	2800000	90	f	https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:48.951416
7	4	hair	شینیون و استایلینگ عروس کلاسیک و اروپایی	شینیون‌های خطی ماندگار با متریال ضد رطوبت و نصب تور و تاج اختصاصی	2200000	90	t	https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:48.983128
8	5	makeup	میکاپ VIP عروس به سبک لایت اروپایی و گریم سینمایی	زیرسازی ضدآب ۲۴ ساعته با کرم‌پودرهای هدی‌بیوتی و استی‌لودر، طراحی چشم اسموکی شاین	4500000	120	f	https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.018238
9	5	hair	رنگ و آمبره روسی با پلکس‌تراپی اولاپلکس	روشن‌سازی ساقه بدون آسیب به کوتیکول و تقویت پیوندهای دی‌سولفیدی مو با اولاپلکس شماره ۱ و ۲	3600000	150	t	https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.02615
10	6	nail	کاشت پلی‌ژل فیبری و مانیکور اپکس روسی	کاشت سبک بدون فرمالین، ایجاد انحنای استاندارد ناخن و استحکام‌بخشی با بیلدربیس	980000	90	t	https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.063656
11	6	eyelash_eyebrow	میکروبلیدینگ فیبروز سوپرنچرال با رنگ ارگانیک	خطوط بسیار باریک تار به تار هم‌جهت با رویش موی ابرو بدون تغییر رنگ به قرمزی یا طوسی	2100000	100	f	https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.071089
12	7	hair	بوتاکس گرم مو و پروتئین‌تراپی برزیلی	آب‌رسانی عمیق ساقه موهای خشک، کنترل وزی مو و احیای ابریشمی با روغن آرگان مراکشی	2400000	110	t	https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.105878
13	8	skincare	فیشیال جلبک دریایی کاسپین و سم‌زدایی پوست	پاکسازی عمیق با ماسک اسپیرولینا، تخلیه جوش‌های سرسیاه و ماساژ گواشا با سنگ یشم خنک	2100000	80	t	https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.138742
14	9	hair	کراتین و نانوریسپشن مقاوم به آب‌وهوای گرم و مرطوب	فرمول اختصاصی ضد رطوبت و تعریق شدید، صافی شلاقی ۱۰۰٪ با ماندگاری بالای ۱ سال	3900000	130	t	https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.173956
15	10	eyelash_eyebrow	اکستنشن مژه هیبریدی و والیوم خط چشمی با چسب UV	تکنیک نوین چسب ال‌ای‌دی ضدحساسیت و آب‌بندی در چند ثانیه، ماندگاری تا ۶ هفته	1650000	90	t	https://images.unsplash.com/photo-1583001809873-a128495da465?auto=format&fit=crop&w=600&q=80	2026-11-01 17:33:49.20325
\.


--
-- Data for Name: specialists; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.specialists (id, user_id, salon_id, specialty_line, bio, experience_years, is_verified, is_mobile_active, avatar_url, created_at) FROM stdin;
1	11	1	skincare	دارای مدرک بین‌المللی بیوتی تراپیست از آکادمی ژنو و مدرس فیشیال‌های جوانساز با متدهای روز اروپا	12	t	f	https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:48.872099
2	14	1	hair	متخصص ژورنال‌خوانی و تکنیک‌های آمبره روسی، بالیاژ خطی و بوتاکس مو با تضمین سلامت ساقه	10	t	f	https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:48.888982
3	15	1	nail	دارای سرتیفیکیت مانیکور روسی از مسکو، متخصص کاشت فیگور، ژلیش مغناطیسی و دیزاین مینیمال	8	t	t	https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:48.904256
4	16	2	skincare	بیش از ۱۵ سال تجربه در جوان‌سازی بالینی، تزریق مزوژل‌های ساختاری و اصلاح لک‌های مقاوم پوستی	16	t	f	https://images.unsplash.com/photo-1594824813501-489e217d8481?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:48.936472
5	17	3	massage_spa	متخصص آیین‌های آرامش‌بخش حمام سنتی و استفاده از اسانس‌های اسنشیال روغنی دردهای عضلانی	11	t	t	https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:48.966928
6	18	4	hair	مدرس تخصصی شینیون و استایل مو در آکادمی‌های معتبر اصفهان، برنده مسابقات استایلینگ ۱۳۹۹	8	t	t	https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:48.99934
7	19	5	makeup	مسترکلاس‌های تخصصی در دبی و استانبول، متخصص طراحی چهره طبیعی عروس با ماندگاری طولانی	14	t	f	https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:49.047109
8	20	6	eyelash_eyebrow	مدرک بین‌المللی PhiAcademy بلگراد و متخصص طراحی ابروی متقارن براساس نسبت طلایی صورت	9	t	t	https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:49.085697
9	21	7	hair	مدرس لاین‌های احیا و صافی مو در استان البرز با بیش از ۱۰ سال سابقه کار حرفه‌ای	10	t	t	https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:49.120863
10	22	8	skincare	مدرس فیشیال‌های هولستیک در شمال کشور و بهره‌گیری از مواد گیاهی و ارگانیک دریایی	11	t	t	https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:49.159415
11	23	9	hair	مبتکر پروتکل‌های صافی موهای وز و فر آفریقایی متناسب با اقلیم جنوب کشور	13	t	t	https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:49.187407
12	24	10	eyelash_eyebrow	مدرس بین‌المللی اکستنشن مژه و فیبروز با گواهینامه اکستنشن UV از مونیخ آلمان	10	t	t	https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80	2026-11-01 17:33:49.217906
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.transactions (id, booking_id, amount, gateway_reference, status, type, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: beauty
--

COPY public.users (id, uid, email, full_name, phone, role, salon_id, managed_line, created_at, status, avatar) FROM stdin;
2	phone_09141111111	09141111111@boya.ir	کاربر 1111	09141111111	customer	\N	\N	2026-10-31 13:30:00.627639	active	\N
3	phone_09143849789	09143849789@boya.ir	کاربر 9789	09143849789	customer	\N	\N	2026-10-31 14:54:28.434071	active	\N
4	phone_09121111111	09121111111@boya.ir	مهندس حسینی (ادمین کل)	09121111111	super_admin	\N	\N	2026-10-31 15:34:56.955438	active	\N
6	phone_09121114455	09121114455@boya.ir	کاربر 4455	09121114455	customer	\N	\N	2026-10-31 17:34:57.256852	active	\N
9	phone_09120001100	09120001100@boya.ir	مهندس حسینی (مدیر کل بویا)	09120001100	super_admin	\N	\N	2026-11-01 17:33:48.759878	active	\N
10	phone_09122233445	09122233445@boya.ir	دکتر صبا معتمدی	09122233445	salon_admin	\N	\N	2026-11-01 17:33:48.772818	active	\N
11	phone_09123451120	09123451120@boya.ir	مریم شمس‌آرا	09123451120	salon_specialist	\N	\N	2026-11-01 17:33:48.780716	active	\N
12	phone_09123456789	09123456789@boya.ir	شادی بهرامی	09123456789	customer	\N	\N	2026-11-01 17:33:48.788597	active	\N
13	phone_09134445566	09134445566@boya.ir	مهتاب صفوی (متقاضی جدید سالن)	09134445566	salon_admin	\N	\N	2026-11-01 17:33:48.796634	active	\N
14	phone_09124567788	09124567788@boya.ir	نازنین رادمنش	09124567788	salon_specialist	1	\N	2026-11-01 17:33:48.880945	active	\N
15	phone_09127778899	09127778899@boya.ir	سارا محمدی	09127778899	mobile_specialist	1	\N	2026-11-01 17:33:48.896568	active	\N
16	phone_09129988776	09129988776@boya.ir	دکتر نگین افشار	09129988776	salon_specialist	2	\N	2026-11-01 17:33:48.928489	active	\N
17	phone_09178885544	09178885544@boya.ir	ستاره کیانی	09178885544	mobile_specialist	3	\N	2026-11-01 17:33:48.95947	active	\N
18	phone_09137778899	09137778899@boya.ir	مهسا نوریان	09137778899	mobile_specialist	4	\N	2026-11-01 17:33:48.991423	active	\N
19	phone_09152223344	09152223344@boya.ir	فرنوش ابراهیمی	09152223344	salon_specialist	5	\N	2026-11-01 17:33:49.037429	active	\N
20	phone_09142225566	09142225566@boya.ir	آیدا حسینی	09142225566	mobile_specialist	6	\N	2026-11-01 17:33:49.078217	active	\N
21	phone_09126663322	09126663322@boya.ir	رویا میرزایی	09126663322	mobile_specialist	7	\N	2026-11-01 17:33:49.113228	active	\N
23	phone_09162228899	09162228899@boya.ir	لیلا باوی	09162228899	mobile_specialist	9	\N	2026-11-01 17:33:49.180627	active	\N
1	phone_09145151435	09145151435@boya.ir	دکتر نصیری(مالک پروژه بویا)	09145151435	super_admin	\N	\N	2026-10-31 13:03:20.897911	active	\N
5	phone_token_super_admin_mock	token_super_admin_mock@boya.ir	کاربر mock	token_super_admin_mock	customer	\N	\N	2026-10-31 16:16:32.450795	suspended	\N
7	phone_09149999999	09149999999@boya.ir	متخصص بارانا 1	09149999999	salon_specialist	11	\N	2026-10-31 21:00:20.188928	active	\N
22	phone_09114447788	09114447788@boya.ir	سپیده دیلمی	09114447788	mobile_specialist	8	\N	2026-11-01 17:33:49.145942	active	\N
25	phone_09143189739	09143189739@boya.ir	متخصص سیار 22	09143189739	mobile_specialist	\N	\N	2026-11-01 19:03:48.998893	active	\N
24	phone_09124449900	09124449900@boya.ir	پریناز کاظمی	09124449900	salon_specialist	11	\N	2026-11-01 17:33:49.210617	active	\N
8	phone_09143189734	09143189734@boya.ir	سحر حسینی	09143189734	salon_admin	11	\N	2026-11-01 05:14:15.851976	active	/uploads/img_1793630961876_77f19434.jpg
\.


--
-- Name: admin_profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.admin_profile_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 33, true);


--
-- Name: bookings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.bookings_id_seq', 3, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: portfolio_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.portfolio_items_id_seq', 1, false);


--
-- Name: revoked_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.revoked_tokens_id_seq', 13, true);


--
-- Name: salons_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.salons_id_seq', 12, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.services_id_seq', 15, true);


--
-- Name: specialists_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.specialists_id_seq', 12, true);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: beauty
--

SELECT pg_catalog.setval('public.users_id_seq', 27, true);


--
-- Name: admin_profile admin_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.admin_profile
    ADD CONSTRAINT admin_profile_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_tracking_code_unique; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_tracking_code_unique UNIQUE (tracking_code);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: portfolio_items portfolio_items_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_pkey PRIMARY KEY (id);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (id);


--
-- Name: revoked_tokens revoked_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_token_key UNIQUE (token);


--
-- Name: salons salons_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.salons
    ADD CONSTRAINT salons_pkey PRIMARY KEY (id);


--
-- Name: salons salons_tenant_id_unique; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.salons
    ADD CONSTRAINT salons_tenant_id_unique UNIQUE (tenant_id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: specialists specialists_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.specialists
    ADD CONSTRAINT specialists_pkey PRIMARY KEY (id);


--
-- Name: specialists specialists_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.specialists
    ADD CONSTRAINT specialists_user_id_unique UNIQUE (user_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: bookings unique_specialist_slot; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT unique_specialist_slot UNIQUE (specialist_id, date, "time");


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_uid_unique; Type: CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_uid_unique UNIQUE (uid);


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_customer_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_customer_id_users_id_fk FOREIGN KEY (customer_id) REFERENCES public.users(id);


--
-- Name: bookings bookings_salon_id_salons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_salon_id_salons_id_fk FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: bookings bookings_service_id_services_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_services_id_fk FOREIGN KEY (service_id) REFERENCES public.services(id);


--
-- Name: bookings bookings_specialist_id_specialists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_specialist_id_specialists_id_fk FOREIGN KEY (specialist_id) REFERENCES public.specialists(id);


--
-- Name: portfolio_items portfolio_items_specialist_id_specialists_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.portfolio_items
    ADD CONSTRAINT portfolio_items_specialist_id_specialists_id_fk FOREIGN KEY (specialist_id) REFERENCES public.specialists(id);


--
-- Name: services services_salon_id_salons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_salon_id_salons_id_fk FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: specialists specialists_salon_id_salons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.specialists
    ADD CONSTRAINT specialists_salon_id_salons_id_fk FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- Name: specialists specialists_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.specialists
    ADD CONSTRAINT specialists_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: transactions transactions_booking_id_bookings_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_booking_id_bookings_id_fk FOREIGN KEY (booking_id) REFERENCES public.bookings(id);


--
-- Name: users users_salon_id_salons_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: beauty
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_salon_id_salons_id_fk FOREIGN KEY (salon_id) REFERENCES public.salons(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Te2Law1q0eC0bQpNM8OxKur5haadHyUGItO4GbGCRvSO7TDqvqcILwmNlathpbP

