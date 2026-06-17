@EndUserText.label: 'Dashboard Note'
@AbapCatalog.tableEnhancement.category : #NOT_EXTENSIBLE
define table ztb_dashboard_note {
  key client    : mandt not null;
  key note_id   : abap.char(40) not null;
  module        : abap.char(2) not null;
  title         : abap.char(255);
  content       : abap.string(0);
  section       : abap.char(40);
  author        : abap.char(40);
  font_size     : abap.char(4);
  font_family   : abap.char(20);
  created_at    : abap.utclong;
  updated_at    : abap.utclong;
}

@AccessControl.authorizationCheck: #NOT_REQUIRED
@EndUserText.label: 'Dashboard Note'
define root view entity Z_C_DashboardNote
  as select from ztb_dashboard_note
{
  key note_id   as NoteId,
      module    as Module,
      title     as Title,
      content   as Content,
      section   as Section,
      author    as Author,
      font_size as FontSize,
      font_family as FontFamily,
      created_at as CreatedAt,
      updated_at as UpdatedAt
}
