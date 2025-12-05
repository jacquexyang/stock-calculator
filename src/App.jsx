import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";

// --- 請在此處填入您的 Firebase 設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyDrsekbYBycZYzWiYLK-QssLmLSKBe2nKQ",
  authDomain: "my-stock-app-97ba6.firebaseapp.com",
  projectId: "my-stock-app-97ba6",
  storageBucket: "my-stock-app-97ba6.firebasestorage.app",
  messagingSenderId: "243658788024",
  appId: "1:243658788024:web:7ccd31f4dd10e6ee56b84d"
};

// 初始化 Firebase
let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  // 忽略重複初始化
}

// --- 熱門台股代號中文對照表 ---
const TW_STOCK_MAP = {
  // 權值股 / 電子
  '2330': '台積電', '2317': '鴻海', '2454': '聯發科', '2308': '台達電', 
  '2303': '聯電', '2379': '瑞昱', '2382': '廣達', '2357': '華碩',
  '3008': '大立光', '3034': '聯詠', '3231': '緯創', '3711': '日月光投控',
  '4938': '和碩', '2327': '國巨', '2412': '中華電', '3045': '台灣大', '4904': '遠傳',
  
  // 傳產 / 航運 / 鋼鐵
  '2002': '中鋼', '1101': '台泥', '1102': '亞泥', '1216': '統一',
  '1301': '台塑', '1303': '南亞', '1326': '台化', '6505': '台塑化',
  '2603': '長榮', '2609': '陽明', '2615': '萬海', '2618': '長榮航', '2610': '華航',
  '2207': '和泰車', '9910': '豐泰', '2105': '正新',
  
  // 金融
  '2881': '富邦金', '2882': '國泰金', '2891': '中信金', '2886': '兆豐金',
  '2884': '玉山金', '2885': '元大金', '2892': '第一金', '2880': '華南金',
  '2883': '開發金', '2887': '台新金', '2890': '永豐金', '5880': '合庫金',
  '5871': '中租-KY', '5876': '上海商銀',
  
  // 熱門 ETF
  '0050': '元大台灣50', '0056': '元大高股息', '00878': '國泰永續高股息',
  '00929': '復華台灣科技優息', '00919': '群益台灣精選高息', '006208': '富邦台50',
  '00713': '元大台灣高息低波', '0051': '元大中型100', '00675L': '富邦臺灣加權正2'
};

// --- 圖示元件 ---
const IconTrendingUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);
const IconGoogle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mr-2"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);
const IconTrash = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const IconShoppingBag = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
);
const IconSearch = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);
const IconSettings = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const IconBox = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
);
const IconCheck = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);
const IconX = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
const IconChevronDown = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
);
const IconRefresh = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);
const IconEdit = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
);
const IconCalendar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

// --- UI 元件 ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 ${className}`}>
    {children}
  </div>
);

// 增加 className 屬性以支援彈性排版
const InputField = ({ label, value, onChange, prefix, suffix, type = "number", step = "any", placeholder = "", onKeyDown, className = "mb-4" }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
    <div className="relative rounded-md shadow-sm">
      {prefix && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-sm">{prefix}</span></div>}
      <input
        type={type === 'text' ? 'text' : type === 'date' ? 'date' : 'number'}
        value={value}
        onChange={(e) => onChange(type === 'text' || type === 'date' ? e.target.value : Number(e.target.value))}
        onKeyDown={onKeyDown}
        step={step}
        placeholder={placeholder}
        className={`focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300 rounded-md p-2.5 border bg-gray-50 focus:bg-white transition-colors ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><span className="text-gray-500 sm:text-sm">{suffix}</span></div>}
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options, className = "mb-4" }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md border bg-gray-50"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const StatCard = ({ title, value, subValue, type = "neutral" }) => {
  let colorClass = "text-gray-900";
  if (type === "profit") colorClass = "text-red-600";
  if (type === "loss") colorClass = "text-green-600";

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{title}</div>
      <div className={`text-xl font-bold ${colorClass}`}>{value}</div>
      {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
    </div>
  );
};

export default function StockCalculator() {
  // --- State ---
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('buy');
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
  // API & Data
  const [finnhubToken, setFinnhubToken] = useState(() => localStorage.getItem('finnhub_token') || '');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  
  // 庫存即時報價
  const [currentPrices, setCurrentPrices] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 手動編輯現價 State
  const [editingPriceSymbol, setEditingPriceSymbol] = useState(null); // 目前正在編輯哪檔股票
  const [manualPriceInput, setManualPriceInput] = useState("");

  // 買入表單 State
  const [inputSymbol, setInputSymbol] = useState("");
  const [stockName, setStockName] = useState("");
  const [buyPrice, setBuyPrice] = useState(0);
  const [shares, setShares] = useState(1000);
  // 新增：買入日期 (預設今天)
  const [buyDate, setBuyDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // 賣出 Modal State
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [sellPrice, setSellPrice] = useState(0);
  // 賣出時的手續費設定 (獨立 State，不影響全域)
  const [sellFeeRate, setSellFeeRate] = useState(0.1425);
  const [sellDiscount, setSellDiscount] = useState(6);
  const [sellMinFee, setSellMinFee] = useState(20);
  const [sellTaxRate, setSellTaxRate] = useState(0.003);

  // 全局設定 (預設費率) - 從 localStorage 讀取，若無則使用預設值
  const [feeRate, setFeeRate] = useState(() => Number(localStorage.getItem('default_feeRate')) || 0.1425);
  const [discount, setDiscount] = useState(() => Number(localStorage.getItem('default_discount')) || 6);
  const [minFee, setMinFee] = useState(() => Number(localStorage.getItem('default_minFee')) || 20);
  const [taxRate, setTaxRate] = useState(() => Number(localStorage.getItem('default_taxRate')) || 0.003);

  // 自動儲存設定變更到 localStorage
  useEffect(() => {
    localStorage.setItem('default_feeRate', feeRate);
    localStorage.setItem('default_discount', discount);
    localStorage.setItem('default_minFee', minFee);
    localStorage.setItem('default_taxRate', taxRate);
  }, [feeRate, discount, minFee, taxRate]);

  // 預估計算結果
  const [estimatedBuyCost, setEstimatedBuyCost] = useState(0);
  const [estimatedBuyFee, setEstimatedBuyFee] = useState(0);

  // --- 計算買入成本 (即時) ---
  useEffect(() => {
    const rawTotal = buyPrice * shares;
    const rawFee = Math.floor(rawTotal * (feeRate / 100) * (discount >= 10 ? discount / 100 : discount / 10));
    const finalFee = Math.max(rawFee, minFee);
    const totalCost = rawTotal + finalFee;
    setEstimatedBuyCost(totalCost);
    setEstimatedBuyFee(finalFee);
  }, [buyPrice, shares, feeRate, discount, minFee]);

  // --- 計算庫存分組 (新功能) ---
  const groupedInventory = useMemo(() => {
    const groups = {};
    inventory.forEach(item => {
      const key = item.symbol || item.stockName;
      if (!groups[key]) {
        groups[key] = {
          symbol: item.symbol,
          stockName: item.stockName,
          totalShares: 0,
          totalCost: 0,
          items: []
        };
      }
      groups[key].totalShares += item.shares;
      groups[key].totalCost += item.buyCost; // 累積總買入成本
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }, [inventory]);

  // --- Firebase Listeners ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(
          collection(db, "calculations"), 
          where("userId", "==", currentUser.uid)
        );

        const unsubData = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
               const timeA = a.createdAt?.seconds || Date.now() / 1000;
               const timeB = b.createdAt?.seconds || Date.now() / 1000;
               return timeB - timeA; 
            });
          
          const openPositions = docs.filter(d => d.status === 'open');
          const closedPositions = docs.filter(d => d.status === 'closed' || !d.status);
          
          setInventory(openPositions);
          setHistory(closedPositions);
        }, (error) => {
            console.error("Firestore Error:", error);
        });
        return () => unsubData();
      } else {
        setInventory([]);
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- API Functions ---
  useEffect(() => {
    localStorage.setItem('finnhub_token', finnhubToken);
  }, [finnhubToken]);

  // 抓取庫存中所有股票的最新價格 (修復版)
  const fetchInventoryPrices = async () => {
    if (!finnhubToken || inventory.length === 0) return;
    setIsRefreshing(true);
    
    // 取得不重複的股票代號
    const symbols = [...new Set(inventory.map(i => i.symbol))];
    const newPrices = {};

    // 改用 Promise.all 配合 map 內部的 try-catch，確保單一失敗不影響整體
    await Promise.all(symbols.map(async (sym) => {
        if (!sym) return;
        
        // 確保有 .TW 後綴
        let querySym = sym.trim();
        if (/^\d{4,6}$/.test(querySym)) querySym += '.TW'; // 如果是純數字，加上 .TW

        try {
            const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${querySym}&token=${finnhubToken}`);
            const data = await res.json();
            
            // 只有當股價 > 0 時才更新 (避免 API 回傳 0 導致錯誤覆蓋)
            if (data && data.c > 0) {
                newPrices[sym] = data.c; 
            }
        } catch (e) {
            console.error(`Fetch error for ${sym}:`, e);
        }
    }));

    if (Object.keys(newPrices).length > 0) {
        setCurrentPrices(prev => ({ ...prev, ...newPrices }));
    }
    
    setIsRefreshing(false);
  };

  // 當切換到庫存頁面且有 Token 時，自動更新報價
  useEffect(() => {
    if (activeTab === 'inventory' && finnhubToken) {
        fetchInventoryPrices();
    }
  }, [activeTab, inventory.length]); 

  // --- 手動輸入現價相關功能 ---
  const startEditingPrice = (symbol, currentVal) => {
    setEditingPriceSymbol(symbol);
    setManualPriceInput(currentVal ? String(currentVal) : "");
  };

  const saveManualPrice = (symbol) => {
    const val = parseFloat(manualPriceInput);
    if (!isNaN(val) && val > 0) {
        setCurrentPrices(prev => ({ ...prev, [symbol]: val }));
    }
    setEditingPriceSymbol(null);
  };
  
  const handleManualPriceKeyDown = (e, symbol) => {
    if (e.key === 'Enter') {
        saveManualPrice(symbol);
    }
  };

  // --- 搜尋股票 ---
  const handleSearchStock = async () => {
    if (!finnhubToken) {
      setQuoteError("請先設定 API Key");
      setShowSettings(true);
      return;
    }
    if (!inputSymbol) return;

    setLoadingQuote(true);
    setQuoteError('');
    
    let symbol = inputSymbol.trim().toUpperCase();
    let stockId = symbol; 
    
    if (/^\d{4,6}$/.test(symbol)) { 
        stockId = symbol;
        symbol += '.TW';
    } else if (symbol.endsWith('.TW')) {
        stockId = symbol.replace('.TW', '');
    }

    try {
        const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubToken}`);
        const quoteData = await quoteRes.json();

        const profileRes = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${finnhubToken}`);
        const profileData = await profileRes.json();

        if (quoteData.c === 0 && quoteData.d === null) {
            setQuoteError("查無資料，請確認代號");
        } else {
            setBuyPrice(quoteData.c);
            const mappedName = TW_STOCK_MAP[stockId];
            setStockName(mappedName || profileData.name || symbol); 
            if(symbol !== inputSymbol) setInputSymbol(symbol);
        }
    } catch (err) {
        console.error(err);
        setQuoteError("連線錯誤");
    } finally {
        setLoadingQuote(false);
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider).catch(e => alert(e.message));
  };

  const handleLogout = () => signOut(auth);

  // 1. 買入
  const handleBuy = async () => {
    if (!user) return alert("請先登入");
    if (buyPrice <= 0) return alert("價格必須大於 0");
    
    // 處理日期：如果有選日期，使用該日期的中午 12:00 (避免時區問題導致日期跑掉)，否則使用 serverTimestamp
    const timestamp = buyDate 
        ? Timestamp.fromDate(new Date(`${buyDate}T12:00:00`)) 
        : serverTimestamp();

    try {
      await addDoc(collection(db, "calculations"), {
        userId: user.uid,
        symbol: inputSymbol,
        stockName: stockName || inputSymbol,
        buyPrice: Number(buyPrice),
        shares: Number(shares),
        buyFee: estimatedBuyFee,
        buyCost: estimatedBuyCost,
        status: 'open',
        feeRate,
        discount,
        minFee,
        taxRate,
        createdAt: timestamp,
        buyDate: buyDate // 額外儲存字串格式以便顯示
      });
      
      setActiveTab('inventory');
      setStockName("");
      setInputSymbol("");
      setBuyPrice(0);
      // 日期重置回今天
      setBuyDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error(error);
      alert("儲存失敗");
    }
  };

  // 準備賣出
  const openSellModal = (item) => {
    setSelectedStock(item);
    setSellPrice(item.buyPrice);
    // 開啟時自動帶入目前的全域設定作為預設值
    setSellFeeRate(feeRate);
    setSellDiscount(discount);
    setSellMinFee(minFee);
    setSellTaxRate(taxRate);
    setSellModalOpen(true);
  };

  // 2. 賣出
  const handleConfirmSell = async () => {
    if (!selectedStock) return;
    
    const rawSellTotal = sellPrice * selectedStock.shares;
    // 使用彈窗內的設定進行計算，而非全域變數
    const rawSellFee = Math.floor(rawSellTotal * (sellFeeRate / 100) * (sellDiscount >= 10 ? sellDiscount / 100 : sellDiscount / 10));
    const finalSellFee = Math.max(rawSellFee, sellMinFee);
    const tax = Math.floor(rawSellTotal * sellTaxRate);
    const sellIncome = rawSellTotal - finalSellFee - tax;
    const netProfit = sellIncome - selectedStock.buyCost;
    const roi = selectedStock.buyCost > 0 ? (netProfit / selectedStock.buyCost) * 100 : 0;

    try {
        await updateDoc(doc(db, "calculations", selectedStock.id), {
            status: 'closed',
            sellPrice: Number(sellPrice),
            sellFee: finalSellFee,
            tax: tax,
            netProfit: netProfit,
            roi: roi,
            soldAt: serverTimestamp()
        });
        setSellModalOpen(false);
        setSelectedStock(null);
    } catch (error) {
        console.error(error);
        alert("平倉失敗");
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("確定要永久刪除此紀錄嗎？此動作無法復原。")) return;
    try {
      await deleteDoc(doc(db, "calculations", id));
    } catch (error) {
      console.error("Delete Error", error);
      alert("刪除失敗");
    }
  };

  const totalProfit = history.reduce((acc, curr) => acc + (curr.netProfit || 0), 0);
  const winCount = history.filter(d => (d.netProfit || 0) > 0).length;
  const winRate = history.length > 0 ? Math.round((winCount / history.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
      <div className="max-w-4xl mx-auto">
        
        {/* Navbar */}
        <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="px-4 py-3 flex justify-between items-center max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-red-600 rounded-lg shadow text-white">
                <IconTrendingUp />
              </div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">台股交易日記</h1>
            </div>
            
            <div className="flex items-center gap-2">
               <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition ${showSettings ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                title="API 設定"
              >
                <IconSettings />
              </button>

              {user ? (
                <div className="flex items-center gap-3">
                   <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-gray-200 hidden sm:block" />
                  <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 px-2 py-1 rounded">登出</button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin}
                  className="flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-full shadow-sm hover:bg-gray-50 text-xs font-bold text-gray-700 transition"
                >
                  <IconGoogle />
                  登入
                </button>
              )}
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 animate-in slide-in-from-top-2">
               <div className="max-w-md mx-auto space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Finnhub API Key</label>
                    <div className="flex gap-2">
                        <input 
                        type="password" 
                        value={finnhubToken} 
                        onChange={(e) => setFinnhubToken(e.target.value)}
                        placeholder="請輸入 API Key"
                        className="flex-1 text-sm border-gray-300 rounded-md p-2 border focus:ring-red-500 focus:border-red-500"
                        />
                    </div>
                    <div className="mt-1 text-xs text-gray-400">用於自動抓取股價與名稱。</div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">預設手續費率 (全域設定)</h4>
                      <div className="grid grid-cols-3 gap-2">
                          <div>
                              <label className="text-[10px] text-gray-400">費率(%)</label>
                              <input 
                                type="number" 
                                value={feeRate} 
                                onChange={(e) => setFeeRate(Number(e.target.value))}
                                className="w-full text-sm border-gray-300 rounded-md p-1.5 border"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] text-gray-400">折扣(折)</label>
                              <input 
                                type="number" 
                                value={discount} 
                                onChange={(e) => setDiscount(Number(e.target.value))}
                                className="w-full text-sm border-gray-300 rounded-md p-1.5 border"
                              />
                          </div>
                          <div>
                              <label className="text-[10px] text-gray-400">低消($)</label>
                              <input 
                                type="number" 
                                value={minFee} 
                                onChange={(e) => setMinFee(Number(e.target.value))}
                                className="w-full text-sm border-gray-300 rounded-md p-1.5 border"
                              />
                          </div>
                      </div>
                      <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <IconCheck /> 設定已自動儲存，下次買入時會自動帶入。
                      </div>
                  </div>

                  <div className="text-center">
                    <button onClick={() => setShowSettings(false)} className="px-6 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">關閉設定</button>
                  </div>
               </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex px-4 space-x-1 text-sm font-medium text-gray-500 border-t border-gray-100 bg-gray-50/50">
            <button 
              onClick={() => setActiveTab('buy')}
              className={`flex-1 sm:flex-none px-4 py-3 border-b-2 transition-colors flex justify-center items-center gap-2 ${activeTab === 'buy' ? 'border-red-500 text-red-600' : 'border-transparent hover:text-gray-800'}`}
            >
              <IconShoppingBag /> 買入填單
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 sm:flex-none px-4 py-3 border-b-2 transition-colors flex justify-center items-center gap-2 ${activeTab === 'inventory' ? 'border-red-500 text-red-600' : 'border-transparent hover:text-gray-800'}`}
            >
              <IconBox /> 庫存損益
              {inventory.length > 0 && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full text-[10px]">{inventory.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:flex-none px-4 py-3 border-b-2 transition-colors flex justify-center items-center gap-2 ${activeTab === 'history' ? 'border-red-500 text-red-600' : 'border-transparent hover:text-gray-800'}`}
            >
              <IconTrendingUp /> 歷史紀錄
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6">
          
          {/* TAB 1: BUY FORM */}
          {activeTab === 'buy' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-4">
                <Card className="border-t-4 border-t-red-500">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <span className="w-2 h-6 bg-red-500 rounded-full"></span>
                            新增買入交易
                        </h2>
                        {/* 日期選擇器 */}
                        <div className="flex items-center gap-2">
                            <IconCalendar />
                            <input 
                                type="date"
                                value={buyDate}
                                onChange={(e) => setBuyDate(e.target.value)}
                                className="text-sm border-gray-300 rounded-md p-1.5 border focus:ring-red-500 focus:border-red-500 bg-gray-50"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        {/* 股票代號查詢區 */}
                        <div className="flex gap-2 items-end">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">股票代號</label>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        value={inputSymbol}
                                        onChange={(e) => setInputSymbol(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStock()}
                                        placeholder="例如 2330"
                                        className="block w-full text-lg font-bold p-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 bg-gray-50"
                                    />
                                    {loadingQuote && <div className="absolute right-3 top-4 text-xs text-gray-400">查詢中...</div>}
                                </div>
                            </div>
                            <button 
                                onClick={handleSearchStock}
                                className="mb-px bg-gray-800 text-white px-5 py-3.5 rounded-lg font-medium hover:bg-black transition shadow-sm"
                            >
                                <IconSearch />
                            </button>
                        </div>
                        {quoteError && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{quoteError}</div>}

                        {/* 股票名稱 (可編輯) */}
                        <InputField label="股票名稱 (可手動修改)" type="text" value={stockName} onChange={setStockName} placeholder="查詢後自動帶入" />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="成交單價" value={buyPrice} onChange={setBuyPrice} prefix="$" />
                            <InputField label="成交股數" value={shares} onChange={setShares} suffix="股" />
                        </div>
                    </div>
                </Card>

                {/* 參數設定區 (折疊或直接顯示) */}
                <Card>
                   <h3 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2 flex justify-between items-center">
                       <span>手續費設定</span>
                       <span className="text-[10px] text-gray-400 font-normal">已自動載入預設值</span>
                   </h3>
                   <div className="grid grid-cols-2 gap-3">
                        <InputField label="券商手續費 (%)" value={feeRate} onChange={setFeeRate} step="0.0001" />
                        <InputField label="折扣 (折)" value={discount} onChange={setDiscount} step="0.1" />
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                        <InputField label="低消 ($)" value={minFee} onChange={setMinFee} />
                        <SelectField 
                            label="證交稅率" 
                            value={taxRate} 
                            onChange={setTaxRate}
                            options={[
                                { value: 0.003, label: "0.3% (個股)" },
                                { value: 0.0015, label: "0.15% (當沖)" },
                                { value: 0.001, label: "0.1% (ETF)" },
                            ]} 
                        />
                   </div>
                </Card>
              </div>

              {/* 右側：預覽確認 */}
              <div className="lg:col-span-5 space-y-4">
                 <div className="bg-white rounded-xl shadow-lg border border-red-100 overflow-hidden sticky top-24">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white text-center">
                        <div className="text-gray-300 text-sm mb-1 uppercase tracking-wider">預估總成本</div>
                        <div className="text-4xl font-bold tracking-tight">
                            ${Math.round(estimatedBuyCost).toLocaleString()}
                        </div>
                        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
                            <div>成交金額 ${Math.round(buyPrice * shares).toLocaleString()}</div>
                            <div>+</div>
                            <div>手續費 ${estimatedBuyFee}</div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3 text-sm text-gray-600 mb-6">
                            <div className="flex justify-between">
                                <span>日期</span>
                                <span className="font-bold text-gray-900">{buyDate}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>股票</span>
                                <span className="font-bold text-gray-900">{stockName || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>價格</span>
                                <span className="font-bold text-gray-900">${buyPrice}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>股數</span>
                                <span className="font-bold text-gray-900">{shares}</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleBuy}
                            disabled={!user || buyPrice <= 0}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-md transition transform active:scale-95 flex items-center justify-center gap-2
                                ${user && buyPrice > 0 ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            <IconCheck /> 確認買入
                        </button>
                        {!user && <div className="text-center text-xs text-red-500 mt-2">請先登入以儲存紀錄</div>}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY (Grouped with Real-time P/L) */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <span className="text-sm text-gray-500">庫存總覽</span>
                    {inventory.length > 0 && (
                        <button 
                            onClick={fetchInventoryPrices}
                            disabled={isRefreshing}
                            className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                            <IconRefresh /> {isRefreshing ? '更新中...' : '刷新報價'}
                        </button>
                    )}
                </div>
                
                {groupedInventory.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                        <div className="text-gray-400 mb-2">目前沒有庫存</div>
                        <button onClick={() => setActiveTab('buy')} className="text-red-500 font-bold hover:underline">去買一張吧！</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedInventory.map((group, index) => {
                          const avgCost = group.totalShares > 0 ? group.totalCost / group.totalShares : 0;
                          
                          // 計算未實現損益
                          const currentPrice = currentPrices[group.symbol];
                          let marketValue = 0;
                          let estProfit = 0;
                          let estRoi = 0;
                          let hasQuote = false;

                          if (currentPrice) {
                              hasQuote = true;
                              marketValue = Math.round(group.totalShares * currentPrice);
                              // 預估賣出成本 (使用當前全域設定做概算)
                              const rawSellFee = Math.floor(marketValue * (feeRate / 100) * (discount >= 10 ? discount / 100 : discount / 10));
                              const estSellFee = Math.max(rawSellFee, minFee);
                              const estTax = Math.floor(marketValue * taxRate);
                              
                              estProfit = marketValue - estSellFee - estTax - group.totalCost;
                              estRoi = group.totalCost > 0 ? (estProfit / group.totalCost) * 100 : 0;
                          }
                          
                          // 是否正在編輯此股票的價格
                          const isEditing = editingPriceSymbol === group.symbol;

                          return (
                            <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-red-300 transition group relative">
                                {/* Group Header */}
                                <div className="p-5 border-b border-gray-50 bg-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                                {group.symbol}
                                                {/* 手動/API 現價顯示區 */}
                                                {!isEditing ? (
                                                   <div className="flex items-center gap-1">
                                                     {hasQuote ? (
                                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                                                           現價 ${currentPrice}
                                                        </span>
                                                     ) : (
                                                        <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">
                                                            無報價
                                                        </span>
                                                     )}
                                                     <button onClick={() => startEditingPrice(group.symbol, currentPrice)} className="text-gray-400 hover:text-blue-500 p-0.5 rounded">
                                                        <IconEdit />
                                                     </button>
                                                   </div>
                                                ) : (
                                                   <div className="flex items-center gap-1 animate-in fade-in">
                                                      <input 
                                                        type="number" 
                                                        value={manualPriceInput}
                                                        onChange={(e) => setManualPriceInput(e.target.value)}
                                                        onKeyDown={(e) => handleManualPriceKeyDown(e, group.symbol)}
                                                        onBlur={() => saveManualPrice(group.symbol)}
                                                        className="w-16 h-6 text-xs border border-blue-300 rounded px-1 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                        autoFocus
                                                      />
                                                      <button onClick={() => saveManualPrice(group.symbol)} className="text-green-600 hover:text-green-800"><IconCheck /></button>
                                                   </div>
                                                )}
                                            </div>
                                            <div className="text-lg font-bold text-gray-900 leading-tight line-clamp-1 mt-1">{group.stockName}</div>
                                        </div>
                                        {hasQuote ? (
                                            <div className={`text-right ${estProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                <div className="text-sm font-bold">{estProfit >= 0 ? '+' : ''}{estProfit.toLocaleString()}</div>
                                                <div className="text-xs bg-gray-50 px-1 rounded inline-block">
                                                    {estRoi.toFixed(2)}%
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">---</span>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-100">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">總股數</span>
                                            <span className="font-mono font-bold text-gray-900">{group.totalShares.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">平均成本</span>
                                            <span className="font-mono font-bold text-gray-900">${avgCost.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">庫存總成本</span>
                                            <span className="font-mono text-gray-600">${Math.round(group.totalCost).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">預估市值</span>
                                            <span className="font-mono text-gray-600">
                                                {hasQuote ? `$${marketValue.toLocaleString()}` : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Details */}
                                <details className="group/details">
                                    <summary className="cursor-pointer bg-gray-50 px-5 py-2 text-xs text-gray-500 font-medium hover:bg-gray-100 transition flex items-center justify-between select-none">
                                        <span>查看 {group.items.length} 筆明細</span>
                                        <span className="transform group-open/details:rotate-180 transition-transform"><IconChevronDown /></span>
                                    </summary>
                                    <div className="bg-gray-50/50 divide-y divide-gray-100 max-h-60 overflow-y-auto custom-scrollbar">
                                        {group.items.map(item => (
                                            <div key={item.id} className="p-4 flex flex-col gap-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="font-bold text-gray-700">{item.shares} 股</span>
                                                    <span className="font-mono text-gray-500">@ ${item.buyPrice}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-gray-400 mb-2">
                                                     <span>總成本 ${Math.round(item.buyCost).toLocaleString()}</span>
                                                     <span>{item.createdAt?.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : (item.buyDate || '剛剛')}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => openSellModal(item)}
                                                        className="flex-1 bg-white border border-gray-300 text-gray-700 py-1.5 rounded text-xs font-bold hover:bg-gray-50 transition"
                                                    >
                                                        賣出
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(item.id)}
                                                        className="px-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition"
                                                        title="刪除"
                                                    >
                                                        <IconTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                          );
                        })}
                    </div>
                )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-6">
               {/* Stats Header */}
               <div className="grid grid-cols-3 gap-3 md:gap-6">
                <StatCard 
                  title="已實現總損益" 
                  value={`$${totalProfit.toLocaleString()}`} 
                  type={totalProfit >= 0 ? "profit" : "loss"} 
                />
                <StatCard 
                  title="已平倉交易" 
                  value={history.length} 
                  subValue="筆" 
                />
                <StatCard 
                  title="獲利勝率" 
                  value={`${winRate}%`} 
                  type={winRate >= 50 ? "profit" : "neutral"} 
                />
              </div>

               <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">
                    歷史交易明細
                </div>
                <div className="divide-y divide-gray-100">
                    {history.length === 0 ? (
                         <div className="p-8 text-center text-gray-400">尚無歷史紀錄</div>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className="p-4 hover:bg-gray-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-[10px] font-bold shrink-0 ${item.netProfit >= 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        <span className="text-sm">{item.netProfit >= 0 ? '賺' : '賠'}</span>
                                        <span>{item.roi ? item.roi.toFixed(1) : 0}%</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{item.stockName} <span className="text-gray-400 text-xs font-normal">({item.symbol || 'N/A'})</span></div>
                                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                            <span>{item.shares}股</span>
                                            <span>•</span>
                                            <span>買 ${item.buyPrice}</span>
                                            <span>➜</span>
                                            <span>賣 ${item.sellPrice}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 justify-end w-full sm:w-auto mt-2 sm:mt-0">
                                    <div className="text-right">
                                        <div className={`font-bold text-lg ${item.netProfit >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {item.netProfit >= 0 ? '+' : ''}{item.netProfit ? item.netProfit.toLocaleString() : 0}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {item.soldAt?.seconds ? new Date(item.soldAt.seconds * 1000).toLocaleDateString() : '舊資料'}
                                        </div>
                                    </div>
                                    {/* 歷史紀錄刪除按鈕 */}
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="刪除紀錄"
                                    >
                                        <IconTrash />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* SELL MODAL */}
      {sellModalOpen && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">平倉賣出</h3>
                    <button onClick={() => setSellModalOpen(false)} className="text-gray-400 hover:text-gray-600"><IconX /></button>
                </div>
                
                <div className="mb-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600">
                    <div>股票：<span className="font-bold text-gray-900">{selectedStock.stockName}</span></div>
                    <div>股數：<span className="font-bold text-gray-900">{selectedStock.shares}</span></div>
                    <div>買入：<span className="font-bold text-gray-900">${selectedStock.buyPrice}</span></div>
                    <div>總成本：<span className="font-bold text-gray-900">${Math.round(selectedStock.buyCost).toLocaleString()}</span></div>
                </div>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">請輸入賣出價格</label>
                    <input 
                        type="number" 
                        value={sellPrice} 
                        onChange={(e) => setSellPrice(e.target.value)}
                        className="block w-full text-2xl font-bold p-3 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 text-center"
                        autoFocus
                    />
                </div>

                {/* 賣出費用設定區塊 */}
                <div className="mb-6 p-3 border border-gray-100 rounded-lg">
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">賣出費用設定</div>
                    <div className="grid grid-cols-2 gap-3">
                         <InputField label="券商手續費 (%)" value={sellFeeRate} onChange={setSellFeeRate} step="0.0001" className="mb-0" />
                         <InputField label="折扣 (折)" value={sellDiscount} onChange={setSellDiscount} step="0.1" className="mb-0" />
                         <InputField label="低消 ($)" value={sellMinFee} onChange={setSellMinFee} className="mb-0" />
                         <SelectField 
                              label="證交稅率" 
                              value={sellTaxRate} 
                              onChange={setSellTaxRate}
                              options={[
                                  { value: 0.003, label: "0.3% (個股)" },
                                  { value: 0.0015, label: "0.15% (當沖)" },
                                  { value: 0.001, label: "0.1% (ETF)" },
                              ]} 
                              className="mb-0"
                         />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setSellModalOpen(false)}
                        className="py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                    >
                        取消
                    </button>
                    <button 
                        onClick={handleConfirmSell}
                        className="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-lg"
                    >
                        確認賣出
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}