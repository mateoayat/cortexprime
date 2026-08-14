const fields = foundry.data.fields

/**
 * The trait/asset/sfx structure under `actorType` is authored by the GM at runtime through
 * the Actor Settings menu, so it is intentionally modelled as an unstructured ObjectField
 * rather than a fixed schema.
 */
export class CharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema () {
    return {
      actorType: new fields.ObjectField({ required: false, nullable: true, initial: null }),
      pp: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      })
    }
  }
}
