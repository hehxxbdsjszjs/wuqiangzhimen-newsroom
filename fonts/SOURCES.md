# 字体来源与网页使用依据

## 古籍雕版字体：匯文明朝體 v1.0 / Huiwen-mincho

- 设计者：特里王（Terri Wong）。界面中的“古籍雕版”是风格名称；原字体实际属于旧铅印复刻，并不冒称来自明清木版。
- 原作者发布页：https://zhuanlan.zhihu.com/p/344103391
- 本次原始字体取得位置：https://github.com/cntrump/imitation_typeface_fonts/blob/main/匯文明朝體v1.0.ttf
- 原始 TTF 的 name 表、name ID 0（版权字段）为 `Public Domain`。保存原作者声明转录于 `Huiwen-author-statement.md` 的“汇文明朝体”段落；该段允许显示、嵌入、转发、软件捆绑和衍生，禁止单独转售字体。
- 证据边界：原作者知乎页面本次返回 403，不能声称已直接读取该页；授权判断依据为字库内声明及所附作者授权转录，不将第三方仓库的 CC0 标签作为字体授权。
- 网页文件：`engraved-huiwen.woff2`。仅转换容器格式，不修改字形轮廓。完整保留原始字体名称和版权字段。
- 附加证据：`Huiwen-license-evidence.txt`；交付目录的 `huiwen-font-audit.json` 包含原始 SHA-256 和 name 表记录。

## 传统书籍宋体：Noto Serif SC（可变字重）

- 来源：https://github.com/google/fonts/tree/main/ofl/notoserifsc
- 原始字体：https://github.com/google/fonts/blob/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf
- 许可：SIL Open Font License 1.1，原件为 `NotoSerif-OFL.txt`，允许网页嵌入、随软件分发和格式转换；不得单独出售字体文件。
- 网页文件：`body.woff2`，复用本站已保存的完整可变字重字体，正文 400、原有加粗 700。
- 实际名称为 Noto Serif SC，不将其标成另一个版本的思源宋体。

## 筛选与差异

- 已在真实网页同句对照：站酷小薇、香萃刻宋、香萃打字机 W35/W40、汇文明朝体、Noto Serif SC。
- 站酷小薇缺少自然磨损；香萃刻宋/打字机的尖角和凹凸较夸张。汇文明朝体在“第、个、入、欧、女”等结构和自然磨损上最接近参考标题，因此最终采用。
- 图一标题高度吻合，但没有原图字体文件或模板资料，不能确认具体字体版本或宣称逐像素完全一致。图二采用宋体实字形；Noto 的细节比原图更规整、磨损更少。
- 全部使用本站同源字体文件，不依赖 Google Fonts 在线接口；仅实际使用的字面才会触发加载。生僻字符以同站宋体补齐，不会刻意放大中文字符间距。
- 早先已存在的 `title.woff2` 与 `ZCOOL-OFL.txt` 保留原文件，但不再作为当前两种字体选项使用。


## v23：古籍简体可调版

- 新网页文件 `engraved-sc-0.woff2`、`engraved-sc-1a.woff2`、`engraved-sc-1b.woff2`、`engraved-sc-2.woff2`（按Unicode范围分包），内部名称 `Wuqang Engraved SC`。基于上述许可允许衍生的汇文明朝体制作，保留原字体版权字段并明确改名；原始 `engraved-huiwen.woff2` 未覆盖。
- 200–900 为本项目生成的可变轮廓轴，不是原设计师原生多字重。200使用收细轮廓，400保持原版轮廓，900使用加粗轮廓，中间插值；不再依赖CSS描边，不用纸色覆盖笔画。
- 使用FreeType轮廓处理接口，算法资料：https://freetype.org/freetype2/docs/reference/ft2-outline_processing.html 。构建脚本为 `tools/build-engraved.py`，构建依赖仅在临时环境安装，不增加网站运行时依赖。
- 简体显示映射来自OpenCC的TSCharacters字表（opencc-python-reimplemented 0.1.7所附版本），来源 https://github.com/BYVoid/OpenCC ，Apache 2.0原件保留于 `OpenCC-Apache-2.0.txt`。将已收录的繁体编码直接映射到相应简体轮廓，不改写文章原文、图片或段落。
- 映射覆盖数量及具体条目见 `engraved-sc-audit.json`。简体/繁体同组映射进行全表一致性校验。字库仍保留古籍旧印刷笔形（如笔锋、边缘磨损），不把旧笔形与繁体编码混为一谈。
