// Material identity needs texture references, not PNG copies of texture pixels.
// Preseed Three's serialization cache so comparing static materials never
// decodes/re-encodes their images during map generation.
export function staticMaterialKey(material){
 const meta={textures:{},images:{}};
 for(const value of Object.values(material))if(value?.isTexture)meta.textures[value.uuid]={uuid:value.uuid};
 const json=material.toJSON(meta);
 for(const key of ['uuid','name','metadata','userData'])delete json[key];
 return JSON.stringify(json);
}
