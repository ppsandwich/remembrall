alter table note_attachments drop constraint note_attachments_size_bytes_check;
alter table note_attachments add constraint note_attachments_size_bytes_check check (size_bytes > 0 and size_bytes <= 20971520);
