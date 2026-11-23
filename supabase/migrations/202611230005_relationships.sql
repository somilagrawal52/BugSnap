-- Direct relationships for private profile labels; the composite membership
-- foreign keys remain authoritative for workspace integrity.
alter table public.report_comments add constraint comment_author_profile_fk foreign key(author_id) references public.profiles(id);
alter table public.reports add constraint report_assignee_profile_fk foreign key(assignee_id) references public.profiles(id);
