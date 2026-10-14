export function packEntry(data,name){
 const entry=Array.isArray(data)?data.find(x=>x.name===name):data?.[name];
 if(!entry||!Array.isArray(entry.files)||entry.name!==name)throw Error('npm pack returned an unsupported or mismatched package manifest.');
 return entry;
}
