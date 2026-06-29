export type {
  Note,
  DecryptedNote,
  EncryptedPayload,
  NoteSource,
  NotePage,
  UserPreferences,
  UserEncryptionKey,
  SectionShare,
  Attachment,
  PropertyType,
  PropertyDefinition,
  PropertyValue,
} from "./types";

export {
  noteSourceSchema,
  encryptedPayloadSchema,
  createNoteSchema,
  updateNoteSchema,
  bulkDeleteSchema,
  bulkDuplicateSchema,
  bulkCopySchema,
  NOTE_SOURCES,
  MAX_ATTACHMENT_SIZE,
  MAX_USER_STORAGE,
  ALLOWED_MIME_PREFIXES,
  PROPERTY_TYPES,
  propertyTypeSchema,
  propertyDefinitionSchema,
  propertyValueSchema,
} from "./validation";

export { derivePreview, sortNotes, searchNotes, formatBulkCopy, extractTags, stripTags, addTag, removeTag, parseChecklists } from "./noteUtils";
export type { ChecklistStats } from "./noteUtils";

export {
  validatePropertyValue,
  formatPropertyValue,
  defaultPropertyValue,
  filterNotesByProperties,
  searchNotesWithProperties,
  getDefaultFilterOperators,
} from "./propertyUtils";

export type { PropertyFilter, PropertyFilterOperator } from "./propertyUtils";

export { evaluateFormula, validateFormula, getReferencedPropertyIds } from "./formulaEngine";
