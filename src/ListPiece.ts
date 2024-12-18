/**
 * @file ListPiece.ts
 * @author Chahan
 * @author Quentin
 * @description List of all pieces in the game
 */

/**
 * List of all piece codes in the game.
 * Each code represents a piece with specific edges.
 * The format is "ABCD" where:
 * - A: Top edge
 * - B: Right edge
 * - C: Bottom edge
 * - D: Left edge
 *
 * Example:
 * "AQXX" means:
 * - Top edge: A
 * - Right edge: Q
 * - Bottom edge: X
 * - Left edge: X
 */
export const PieceCodes = [
	"AQXX", "AEXX", "IQXX", "QIXX", "BAXA", "JIXA", "FAXA", "FMXA", "KQXA", "GEXA", "OIXA", "HEXA", "HMXA", "UEXA", "JAXI", "RQXI", "NMXI",
	"SMXI", "GIXI", "OIXI", "DEXI", "LAXI", "LMXI", "TAXI", "UAXI", "BIXQ", "BQXQ", "JQXQ", "RQXQ", "GMXQ", "OIXQ", "TQXQ", "HIXQ", "HEXQ",
	"PMXQ", "VEXQ", "RAXE", "CMXE", "KMXE", "SIXE", "SQXE", "OAXE", "OIXE", "OQXE", "DAXE", "TEXE", "HEXE", "PEXE", "BMXM", "JAXM", "JIXM",
	"FAXM", "GEXM", "DEXM", "DMXM", "HQXM", "PAXM", "PMXM", "UIXM", "VQXM", "FRBB", "NGBB", "JCBJ", "BHBR", "RVBR", "NNBR", "KJBR", "TFBR",
	"VHBR", "CGBC", "GLBC", "NRBK", "ODBK", "TOBK", "HCBK", "NOBS", "SOBS", "CPBG", "TCBG", "PUBG", "SRBO", "RRBD", "KDBD", "RSBL", "FNBL",
	"HLBL", "PTBL", "BUBT", "FVBT", "DPBT", "KLBH", "SOBH", "SDBH", "DUBH", "LNBH", "UCBU", "DSBV", "THBV", "UFBV", "VUBV", "LOJJ", "LPJJ",
	"PSJJ", "VFJJ", "DOJR", "CHJF", "SHJF", "DOJF", "PKJF", "OLJN", "LOJN", "TSJC", "TPJC", "NDJK", "GLJK", "LKJK", "VPJK", "CUJS", "PLJG",
	"HVJO", "NVJD", "FPJT", "NSJT", "TOJT", "LVJH", "UOJH", "NFJP", "SUJP", "DCJP", "THJP", "FTJU", "LNJU", "NPJV", "KDJV", "DCJV", "PTJV",
	"TGRR", "FCRF", "FKRF", "FLRF", "SURF", "OFRF", "PLRF", "UURF", "CDRN", "RLRC", "RVRC", "CNRC", "OLRC", "FKRS", "DVRS", "KKRG", "KSRG",
	"VPRG", "GGRD", "GLRD", "VGRD", "GPRT", "HFRT", "UURH", "FTRP", "NTRP", "OKRV", "DPRV", "CDFN", "DHFN", "CCFK", "KOFS", "SUFS", "DHFG",
	"TPFG", "UKFG", "OOFO", "LTFO", "GUFD", "GSFL", "NDFT", "LPFH", "HOFH", "GPFP", "KPFU", "GKFU", "SHNN", "VGNC", "SLNK", "HHNK", "UGNS",
	"NUNG", "CSNG", "PSNG", "CCNO", "OTNO", "KGND", "UKNL", "UVNL", "VONL", "KVNT", "SHNT", "TTNT", "SCNH", "UHNP", "VGNP", "LSNU", "LHNU",
	"PCNU", "VUNU", "VGCC", "SVCK", "HOCK", "KSCG", "POCG", "CPCO", "HHCD", "CTCL", "DVCL", "VUCL", "SOCT", "DLCP", "KDCU", "KPCV", "UUCV",
	"UVCV", "LVKK", "TGKK", "POKK", "SOKG", "LLKG", "SHKD", "GVKT", "PHKT", "LTKH", "LUKH", "STSS", "PDSG", "GDSD", "GTSD", "LOSD", "DPSL",
	"OVST", "UOST", "GUSH", "DUSH", "OLGO", "THGO", "VTGD", "PVGU", "UVOO", "LDOD", "DUOL", "PUOT", "VHDD", "HLDL", "PTLH", "UPTP", "PVTV",
	"UVHV"
];

export type PieceCode = typeof PieceCodes[number];