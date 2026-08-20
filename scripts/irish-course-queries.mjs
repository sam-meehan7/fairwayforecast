// Discovery terms for the Irish course catalogue, by county.
//
// api.golfcourseapi.com's /v1/search only matches on club_name (searching
// "golf club kerry" returns 0 results), so these are town and club names —
// Irish clubs are almost always named after their town.
//
// Each term costs one request against a 50/day budget, so the list is ordered
// roughly by how many courses a term is likely to surface. Add to it freely;
// `node scripts/seed-courses.mjs seed-queries` is idempotent and will only
// insert terms that aren't already tracked.

export const IRISH_COURSE_QUERIES = [
  // Dublin
  "portmarnock", "royal dublin", "the island golf", "malahide", "howth",
  "sutton golf", "clontarf golf", "elm park", "milltown golf", "castle golf",
  "grange golf", "stackstown", "edmondstown", "rathfarnham", "hermitage golf",
  "lucan golf", "newlands golf", "corballis", "donabate", "beaverstown",
  "balcarrick", "skerries golf", "balbriggan", "rush golf", "roganstown",
  "st margarets golf", "luttrellstown", "deer park howth", "carrickmines",
  "foxrock golf", "woodbrook golf", "killiney golf", "dun laoghaire golf",
  "slade valley", "hollywood lakes", "forrest little", "beech park",

  // Wicklow
  "druids glen", "powerscourt", "delgany", "greystones", "bray golf",
  "woodenbridge", "arklow golf", "blainroe", "european club", "wicklow golf",
  "charlesland", "glen of the downs", "rathsallagh", "coollattin",
  "baltinglass", "tulfarris", "djouce",

  // Kildare
  "carton house", "the k club", "naas golf", "athy golf", "curragh golf",
  "kildare golf", "killeen golf", "craddockstown", "castlewarden",
  "palmerstown house", "highfield golf", "bodenstown", "cill dara",
  "millicent", "knockanally", "woodlands golf",

  // Meath
  "royal tara", "headfort", "trim golf", "navan golf", "ashbourne golf",
  "laytown bettystown", "black bush", "killeen castle", "gormanston",
  "rathcore", "kells golf",

  // Louth
  "county louth golf", "dundalk golf", "ardee golf", "greenore golf",
  "killin park", "seapoint golf", "townley hall",

  // Westmeath / Offaly / Laois / Longford
  "mullingar golf", "glasson", "athlone golf", "moate golf", "delvin castle",
  "tullamore golf", "esker hills", "birr golf", "edenderry", "castle barna",
  "portarlington", "the heath golf", "abbeyleix", "mountrath", "rathdowney",
  "county longford golf",

  // Carlow / Kilkenny
  "carlow golf", "borris golf", "mount wolseley",
  "kilkenny golf", "mount juliet", "callan golf", "castlecomer", "gowran park",

  // Wexford
  "wexford golf", "rosslare golf", "enniscorthy golf", "courtown",
  "new ross golf", "st helens bay", "seafield golf", "tara glen",

  // Waterford
  "waterford golf", "tramore golf", "dungarvan golf", "west waterford",
  "faithlegg", "waterford castle", "gold coast golf", "dunmore east",
  "lismore golf",

  // Cork
  "cork golf", "douglas golf", "muskerry", "mallow golf", "charleville golf",
  "youghal golf", "fota island", "old head", "kinsale golf", "bandon golf",
  "macroom golf", "fermoy golf", "mitchelstown", "monkstown golf",
  "harbour point", "lee valley golf", "cobh golf", "skibbereen golf",
  "bantry bay", "berehaven", "glengarriff", "kanturk golf", "doneraile",
  "mahon golf", "frankfield", "raffeen creek", "east cork golf",
  "water rock", "coosheen", "castlemartyr", "trabolgan",

  // Kerry
  "ballybunion", "waterville golf", "tralee golf", "killarney golf", "dooks",
  "ceann sibeal", "beaufort golf", "ross golf", "castleisland",
  "kenmare golf", "parknasilla", "killorglin", "listowel golf", "ardfert",

  // Limerick
  "limerick golf", "castletroy", "adare manor", "adare golf",
  "newcastle west", "rathbane", "ballyneety", "abbeyfeale",

  // Clare
  "lahinch", "doonbeg", "ennis golf", "shannon golf", "kilrush golf",
  "kilkee golf", "spanish point", "woodstock ennis", "dromoland",
  "east clare golf",

  // Tipperary
  "clonmel golf", "thurles golf", "nenagh golf", "roscrea golf", "cahir park",
  "tipperary golf", "templemore", "carrick on suir", "ballykisteen",
  "slievenamon", "rockwell",

  // Galway
  "galway golf", "galway bay golf", "oughterard", "connemara golf", "bearna",
  "athenry golf", "tuam golf", "loughrea golf", "ballinasloe", "gort golf",
  "portumna golf", "mountbellew", "glenlo abbey",

  // Mayo
  "westport golf", "castlebar golf", "ballina golf", "belmullet",
  "claremorris", "ballinrobe", "swinford golf", "achill golf", "ballyhaunis",

  // Sligo / Leitrim / Roscommon
  "county sligo golf", "strandhill", "enniscrone", "ballymote",
  "tubbercurry", "ballinamore", "carrick on shannon", "lough rynn",
  "roscommon golf", "boyle golf", "castlerea golf", "ballaghaderreen",

  // Donegal
  "ballyliffin", "rosapenna", "portsalon", "donegal golf", "bundoran golf",
  "letterkenny golf", "narin portnoo", "greencastle golf", "buncrana",
  "dunfanaghy", "cruit island", "gweedore", "redcastle", "north west golf",

  // Cavan / Monaghan
  "cavan golf", "virginia golf", "belturbet", "blacklion", "slieve russell",
  "nuremore", "rossmore golf", "castleblayney", "clones golf",
];
