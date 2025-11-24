# SDS 資料整合工具

## 專案目的
統整SDS資料以供快速查詢  
此專案為`irika-web-system-v2`的資料取得與整理用工具  
若是要貢獻請以透過此工具新增SDS資料為主並在PR中註記資料來源以供驗證內容  
就像前面說的此專案所有內容與機制都以`irika-web-system-v2`為主  
這代表我不會開發與更動irika用不到的內容和PR
如果你要使用其資料註記資料來源就好

## 專案使用
此專案分為四個部分
分別是
```js
data-md    //md單檔案模式格式
data-json  //json格式
data-csv   //csv格式
index.json //索引
```
如果的專案使用 中文名稱 英文名稱 化學式 搜尋整個內容  
我建議使用`index.js`取得 CAS NO. 再使用`CAS NO.`搜尋  
我相信這是個好方法  
此專案是以繁體中文為主 並不考慮其他語言

## SDS資料新增
如果你想不開想要擴充資料內容
你可以在API使用下列範例內容
```jsonc
{
  "CasNo": "67-56-1",
  "ZhtwName": "甲醇",
  "EnName": "Methyl alcohol",
  "ChemicalFormula":"CH3OH",
  "HazardClassification": "易燃液體第2級,急毒性物質(口服)第3級,急毒性物質(吸入)第3級,特定標的器官毒性(單次暴露)第1級",
  "FirstAidMeasures": {
    "Inhalation": "移至空氣流通處，必要時給予人工呼吸並立即就醫",
    "EyeContact": "立即以大量清水沖洗至少15分鐘，並就醫",
    "SkinContact": "以大量清水沖洗，脫去污染衣物",
    "Ingestion": "勿催吐立即就醫"
  },
  "LD50": "5628 mg/kg(大鼠口服)",
  "StabilityAndReactivity": "密封儲存於陰涼、通風良好處，遠離火源與氧化劑"
}
```

你甚至可以使用 ps 或 cmd 而不透過妳自己寫的用戶端新增內容
PS 並使用預設port
```ps
$json = @'
{
  "CasNo": "67-56-1",
  "ZhtwName": "甲醇",
  "EnName": "Methyl alcohol",
  "ChemicalFormula": "CH3OH",
  "HazardClassification": "易燃液體第2級,急毒性物質(口服)第3級,急毒性物質(吸入)第3級,特定標的器官毒性(單次暴露)第1級",
  "FirstAidMeasures": {
    "Inhalation": "移至空氣流通處，必要時給予人工呼吸並立即就醫",
    "EyeContact": "立即以大量清水沖洗至少15分鐘，並就醫",
    "SkinContact": "以大量清水沖洗，脫去污染衣物",
    "Ingestion": "勿催吐立即就醫"
  },
  "LD50": "5628 mg/kg(大鼠口服)",
  "StabilityAndReactivity": "密封儲存於陰涼、通風良好處，遠離火源與氧化劑"
}
'@

Invoke-RestMethod `
  -Uri "http://localhost:5174/api/sds" `
  -Method POST `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($json))
```

當然你發的PR我需要仔細審核內容  
這代表PR中須註明訊息來源及清單  
例如:
```md
# SDS資料更新

## PR目的
只是新增SDS

## 新增SDS清單
- 甲醇 : 67-56-1

## 資料來源
PubChem, NIOSH, ECHA, OSHA Taiwan

如果你以驗證過資料內容請在這邊打謝你的 github name 或是 id :
```
當然此專案不是我專注在維護的專案  
我可能回沒注意到你所發送的內容或PR  
也可能需要審核很久
如果我很久沒留請別灰心  
在該PR下再次留言我看到的機率會很高  
如果再不行可以直接聯繫我的gmail  
但我不一定會鳥你

## 題外話
如果你看完前面感覺我的說明檔包含了一點厭世的情緒甚至因此感覺到不舒服  
那你的想法非常正確  
這是一個來至寫化學實驗預報中SDS安全表寫到崩潰的人零時寫出來的程式  
如果有程式有錯誤請發Issues但請確保禮貌和該錯誤是否存在  
如果可以說明如何重現會更好，畢竟可以省下排錯的時間  
Issues我就不寫模板了畢竟這不是一個正式的專案

## 需可證

[Apache-2.0](LICENSE)  
希望各位使用此專案的資料時請附上我的名子與github星星  
這是對一個快死透的大學生開發者最好的鼓勵與協助  
當然啦你如果拿去商用又不附我的姓名與許可證我也抓不到你  
不過此專案可以商用但至少附個姓名  
