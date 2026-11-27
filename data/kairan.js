// 回覧／配布書類とごみ収集日カレンダーのデータ（新しい月を先頭に追加してください）
// type: 'link' = 発行元の公式サイトへのリンク / 'pdf' = このサイトに置いたPDF
window.KITACHO_KAIRAN = [
    {
        month: '2026-10',
        label: '2026年10月',
        gomi: { ja: 'pdfs/gomi/2026-10-ja.pdf', zh: 'pdfs/gomi/2026-10-zh.pdf' },
        groups: [
            {
                name: '北町町内会から',
                items: [
                    { title: '北町 防災だより 第028号（内水氾濫・アンダーパスに注意）', issuer: '北町町内会', type: 'pdf', url: 'pdfs/kairan/2026-10/bousai-dayori-028.pdf' },
                    { title: '資源回収のお知らせ（10月：4日・11日・25日／11月：1日・8日・22日）', issuer: '北町町内会', type: 'pdf', url: 'pdfs/kairan/2026-10/shigen-kaishu.pdf' }
                ]
            },
            {
                name: '地域の行事',
                items: [
                    { title: '横曽根公民館地区 文化祭（11/7土・8日 横曽根公民館）ポスター', issuer: '横曽根公民館地区文化祭実行委員会', type: 'pdf', url: 'pdfs/kairan/2026-10/bunkasai-poster.pdf' },
                    { title: 'なかまちフェスタ（10/18日 川口診療所）', issuer: '川口診療所＆ケアセンターすこやか', type: 'link', url: 'https://kawaguchi-sukoyaka.com/clinic/nakamachi-festa_2026/' },
                    { title: '第44回 川口マラソン大会に伴う交通規制（12/6日 8:00〜11:00頃）', issuer: '川口市スポーツ協会', type: 'link', url: 'https://kawaspo.jp/pages/16/' }
                ]
            },
            {
                name: '市・公共機関から',
                items: [
                    { title: '広報かわぐち 2026年10月号', issuer: '川口市', type: 'link', url: 'https://www.city.kawaguchi.lg.jp/soshiki/01010/020/2/reiwa07_1/50162.html' },
                    { title: 'PRESS530（ごうさんまる）Vol.126', issuer: '川口市 環境部', type: 'link', url: 'https://www.city.kawaguchi.lg.jp/material/files/group/94/PRESS126.pdf' },
                    { title: '横曽根公民館だより 2026年10月号', issuer: '横曽根公民館', type: 'link', url: 'https://www.city.kawaguchi.lg.jp/material/files/group/176/kanpou10.pdf' },
                    { title: '社協だより 秋号 No.183', issuer: '川口市社会福祉協議会', type: 'link', url: 'https://kawaguchisyakyo.jp/wp-content/uploads/2026/10/R8.10syakyodayori_compressed-1.pdf' },
                    { title: '西川口駅前交番 ミニ広報紙 令和8年10月号', issuer: '川口警察署 西川口駅前交番', type: 'pdf', url: 'pdfs/kairan/2026-10/kouban-minikouhou.pdf' }
                ]
            },
            {
                name: '学校から',
                items: [
                    { title: '仲町中だより 10月号', issuer: '川口市立仲町中学校', type: 'link', url: 'https://nakatyou.edumap.jp/files/download/1938' },
                    { title: '仲町小だより 9月号（9・10月の行事予定）', issuer: '川口市立仲町小学校', type: 'pdf', url: 'pdfs/kairan/2026-10/nakamachi-sho-dayori-09.pdf' }
                ]
            }
        ]
    }
];
