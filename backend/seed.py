"""Idempotent seed: categories (+subcategories), demo stores (seller users), products, settings.
Run: cd /app/backend && python seed.py"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from lib.db import db, ensure_indexes
from models.shop import Category, I18nText, Product, SubCategory


def img(photo: str) -> str:
    return f"https://images.unsplash.com/{photo}?w=800&q=80&auto=format&fit=crop"


def T(ar: str, tr: str, en: str) -> I18nText:
    return I18nText(ar=ar, tr=tr, en=en)


GENDER = [("women", T("نساء", "Kadın", "Women")), ("men", T("رجال", "Erkek", "Men")),
          ("kids", T("أطفال", "Çocuk", "Kids")), ("baby", T("رضّع", "Bebek", "Baby"))]

# slug, icon, name, cover photo, size_type, subcategories
CATEGORIES = [
    ("fashion", "Shirt", T("أزياء", "Moda", "Fashion"), "photo-1532453288672-3a27e9be9efd", "clothing", GENDER),
    ("electronics", "Smartphone", T("إلكترونيات", "Elektronik", "Electronics"), "photo-1487014679447-9f8336841d58", "none", [
        ("phones", T("هواتف", "Cep Telefonu", "Phones")), ("headphones", T("سماعات", "Kulaklık", "Headphones")),
        ("tablets", T("أجهزة لوحية", "Tablet", "Tablets")), ("laptops", T("لابتوب", "Laptop", "Laptops")),
        ("desktops", T("كمبيوتر مكتبي", "Masaüstü PC", "Desktop PCs")), ("monitors", T("شاشات", "Monitör", "Monitors")),
        ("mouse", T("فأرة", "Mouse", "Mice")), ("keyboards", T("لوحات مفاتيح", "Klavye", "Keyboards")),
        ("tv", T("تلفزيونات", "Televizyon", "TVs")), ("smartwatch", T("ساعات ذكية", "Akıllı Saat", "Smartwatches")),
        ("cameras", T("كاميرات", "Fotoğraf Makinesi", "Cameras")), ("gaming", T("ألعاب فيديو وكونسول", "Oyun Konsolu", "Gaming & Consoles")),
        ("speakers", T("مكبرات صوت", "Hoparlör", "Speakers")), ("chargers", T("شواحن وباور بانك", "Şarj & Powerbank", "Chargers & Power Banks")),
        ("phone-accessories", T("إكسسوارات الهاتف", "Telefon Aksesuarı", "Phone Accessories")), ("printers", T("طابعات", "Yazıcı", "Printers")),
        ("storage", T("ذواكر وتخزين", "Depolama & USB", "Storage & USB")), ("networking", T("راوتر وشبكات", "Modem & Ağ", "Routers & Networking")),
    ]),
    ("home", "Sofa", T("المنزل والمعيشة", "Ev & Yaşam", "Home & Living"), "photo-1626806787461-102c1bfaaea1", "none", [
        ("appliances", T("أجهزة منزلية كبيرة", "Beyaz Eşya", "Large Appliances")), ("small-appliances", T("أجهزة صغيرة", "Küçük Ev Aletleri", "Small Appliances")),
        ("lighting", T("إنارة", "Aydınlatma", "Lighting")), ("furniture", T("أثاث", "Mobilya", "Furniture")),
        ("textile", T("مفروشات", "Ev Tekstili", "Home Textiles")), ("decor", T("ديكور", "Dekorasyon", "Decor")),
        ("carpets", T("سجاد", "Halı", "Carpets")), ("bathroom", T("حمام", "Banyo", "Bathroom")),
        ("cleaning", T("تنظيف", "Temizlik", "Cleaning")), ("storage-org", T("تنظيم وتخزين", "Düzenleme & Saklama", "Storage & Organizing")),
        ("heating-cooling", T("تدفئة وتبريد", "Isıtma & Soğutma", "Heating & Cooling")),
    ]),
    ("shoes", "Footprints", T("أحذية", "Ayakkabı", "Shoes"), "photo-1600185365926-3a2ce3cdb9eb", "shoe", [
        ("women", T("نساء", "Kadın", "Women")), ("men", T("رجال", "Erkek", "Men")), ("kids", T("أطفال", "Çocuk", "Kids")),
        ("sports-shoes", T("أحذية رياضية", "Spor Ayakkabı", "Sneakers")),
    ]),
    ("kitchen", "CookingPot", T("المطبخ", "Mutfak", "Kitchen"), "photo-1584990347163-2b86b71390d6", "none", [
        ("cookware", T("أواني طبخ", "Tencere & Tava", "Cookware")), ("tableware", T("أدوات المائدة", "Sofra & Servis", "Tableware")),
        ("small-kitchen", T("أجهزة المطبخ", "Mutfak Aletleri", "Kitchen Appliances")), ("food-storage", T("حفظ الطعام", "Saklama Kabı", "Food Storage")),
    ]),
    ("beauty", "Sparkles", T("جمال وعناية", "Kozmetik", "Beauty"), "photo-1458538977777-0549b2370168", "none", [
        ("perfume", T("عطور", "Parfüm", "Perfume")), ("skincare", T("عناية بالبشرة", "Cilt Bakımı", "Skincare")),
        ("makeup", T("مكياج", "Makyaj", "Makeup")), ("haircare", T("عناية بالشعر", "Saç Bakımı", "Hair Care")),
        ("personal-care", T("عناية شخصية", "Kişisel Bakım", "Personal Care")),
    ]),
    ("food", "Wheat", T("أغذية", "Gıda", "Groceries"), "photo-1648288725055-5ba4063355b9", "none", [
        ("dates-nuts", T("تمور ومكسرات", "Hurma & Kuruyemiş", "Dates & Nuts")), ("oils-spices", T("زيوت وبهارات", "Yağ & Baharat", "Oils & Spices")),
        ("coffee-tea", T("قهوة وشاي", "Kahve & Çay", "Coffee & Tea")), ("sweets", T("حلويات", "Tatlı & Şekerleme", "Sweets")),
    ]),
    ("sports", "Dumbbell", T("رياضة", "Spor", "Sports"), "photo-1638536532686-d610adfc8e5c", "none", [
        ("fitness", T("لياقة بدنية", "Fitness", "Fitness")), ("bicycles", T("دراجات", "Bisiklet", "Bicycles")),
        ("camping", T("تخييم ورحلات", "Kamp & Outdoor", "Camping & Outdoor")), ("team-sports", T("رياضات جماعية", "Takım Sporları", "Team Sports")),
        ("sportswear", T("ملابس رياضية", "Spor Giyim", "Sportswear")), ("swimming", T("سباحة", "Yüzme", "Swimming")),
    ]),
    ("office", "Briefcase", T("مكتب وقرطاسية", "Ofis & Kırtasiye", "Office"), "photo-1654931800100-2ecf6eee7c64", "none", [
        ("stationery", T("قرطاسية", "Kırtasiye", "Stationery")), ("office-furniture", T("أثاث مكتبي", "Ofis Mobilyası", "Office Furniture")),
        ("printer-supplies", T("أحبار ولوازم طباعة", "Yazıcı Sarf Malzemesi", "Printer Supplies")), ("bags", T("حقائب ومحافظ", "Çanta & Evrak", "Bags & Folders")),
        ("school", T("لوازم مدرسية", "Okul Malzemeleri", "School Supplies")),
    ]),
    ("garden", "Sprout", T("الحديقة", "Bahçe", "Garden"), "photo-1416879595882-3373a0480b5b", "none", [
        ("garden-furniture", T("أثاث حدائق", "Bahçe Mobilyası", "Garden Furniture")), ("plants", T("نباتات وبذور", "Bitki & Tohum", "Plants & Seeds")),
        ("tools", T("أدوات الحديقة", "Bahçe Aletleri", "Garden Tools")), ("irrigation", T("ري", "Sulama", "Irrigation")),
        ("bbq", T("شواء", "Mangal & Barbekü", "BBQ & Grills")),
    ]),
    ("auto", "Car", T("قطع وإكسسوارات السيارات", "Oto Parça & Aksesuar", "Auto Parts & Accessories"), "photo-1760836395716-7dd00b71311a", "none", [
        ("parts", T("قطع غيار", "Yedek Parça", "Spare Parts")), ("interior", T("إكسسوارات داخلية", "İç Aksesuar", "Interior Accessories")),
        ("exterior", T("إكسسوارات خارجية", "Dış Aksesuar", "Exterior Accessories")), ("tires", T("إطارات وجنوط", "Lastik & Jant", "Tires & Rims")),
        ("car-electronics", T("إلكترونيات السيارة", "Oto Elektronik", "Car Electronics")), ("care", T("عناية بالسيارة", "Bakım & Temizlik", "Car Care")),
        ("oils", T("زيوت وسوائل", "Motor Yağı & Sıvılar", "Oils & Fluids")),
    ]),
    ("toys", "ToyBrick", T("ألعاب", "Oyuncak", "Toys"), "photo-1587654780291-39c9404d746b", "none", [
        ("educational", T("ألعاب تعليمية", "Eğitici Oyuncak", "Educational")), ("building", T("مكعبات وتركيب", "Lego & Yapı", "Building Blocks")),
        ("plush", T("دمى محشوة", "Peluş", "Plush")), ("dolls", T("دمى وشخصيات", "Bebek & Figür", "Dolls & Figures")),
        ("rc", T("تحكم عن بعد", "Uzaktan Kumandalı", "Remote Control")), ("board-games", T("ألعاب لوحية", "Kutu Oyunları", "Board Games")),
        ("puzzles", T("ألغاز وبازل", "Puzzle", "Puzzles")),
    ]),
    ("hobbies", "Music", T("هوايات", "Hobi", "Hobbies"), "photo-1510915361894-db8b60106cb1", "none", [
        ("music", T("آلات موسيقية", "Müzik Aletleri", "Musical Instruments")), ("books", T("كتب", "Kitap", "Books")),
        ("art", T("رسم وفنون", "Sanat & Resim", "Art & Painting")), ("crafts", T("أشغال يدوية", "El İşi", "Crafts")),
        ("collectibles", T("مقتنيات", "Koleksiyon", "Collectibles")), ("movies-music", T("أفلام وموسيقى", "Film & Müzik", "Movies & Music")),
    ]),
]

SELLERS = [
    ("seed_seller_sham_electronics", "Sham Electronics", "دمشق"),
    ("seed_seller_aleppo_crafts", "Aleppo Crafts", "حلب"),
    ("seed_seller_latakia_style", "Latakia Style", "اللاذقية"),
    ("seed_seller_damascus_market", "Damascus Market", "دمشق"),
]

SIZES = {"fashion": ["S", "M", "L", "XL", "2XL", "3XL"], "shoes": ["38", "39", "40", "41", "42", "43", "44"]}

# (slug, sub, seller_idx, ar, tr, en, price, old_price, stock, rating, reviews, photos)
PRODUCTS = [
    ("electronics", "phones", 0, "هاتف ذكي 128 جيجا بكاميرا ثلاثية", "128 GB Üç Kameralı Akıllı Telefon", "128GB Smartphone with Triple Camera", 289.0, 329.0, 25, 4.6, 214, ["photo-1759588071838-d560be56b2a2", "photo-1759588071814-1ba7c5761af4", "photo-1759588071790-9afb3fd61d23"]),
    ("electronics", "phones", 0, "هاتف أبيض نحيف 256 جيجا", "İnce Beyaz Telefon 256 GB", "Slim White Phone 256GB", 399.0, None, 12, 4.7, 98, ["photo-1759588071814-1ba7c5761af4", "photo-1759588071838-d560be56b2a2"]),
    ("electronics", "laptops", 0, "حامل لابتوب ألمنيوم فائق النحافة", "Ultra İnce Alüminyum Laptop Standı", "Ultra Slim Aluminum Laptop Stand", 24.0, 32.0, 60, 4.4, 76, ["photo-1487014679447-9f8336841d58"]),
    ("electronics", "phones", 0, "هاتف أسود بغطاء حماية", "Kılıflı Siyah Telefon", "Black Phone with Protective Case", 249.0, None, 18, 4.3, 51, ["photo-1759588071790-9afb3fd61d23", "photo-1759588071838-d560be56b2a2"]),
    ("fashion", "men", 2, "قميص صيفي قطني كاجوال", "Pamuklu Günlük Yazlık Gömlek", "Cotton Casual Summer Shirt", 29.9, 39.9, 80, 4.5, 132, ["photo-1612423284934-2850a4ea6b0f", "photo-1532453288672-3a27e9be9efd"]),
    ("fashion", "women", 2, "مجموعة أزياء عصرية", "Modern Moda Kombini", "Modern Fashion Outfit Set", 54.0, None, 30, 4.2, 40, ["photo-1532453288672-3a27e9be9efd", "photo-1612423284934-2850a4ea6b0f"]),
    ("shoes", "sports-shoes", 2, "حذاء رياضي أبيض كلاسيكي", "Klasik Beyaz Spor Ayakkabı", "Classic White Sneakers", 45.0, 60.0, 40, 4.6, 188, ["photo-1608231387042-66d1773070a5", "photo-1600185365926-3a2ce3cdb9eb", "photo-1600185365483-26d7a4cc7519"]),
    ("shoes", "sports-shoes", 2, "حذاء جري برتقالي خفيف", "Hafif Turuncu Koşu Ayakkabısı", "Lightweight Orange Running Shoes", 62.0, None, 22, 4.8, 95, ["photo-1600185365926-3a2ce3cdb9eb", "photo-1608231387042-66d1773070a5", "photo-1600185365483-26d7a4cc7519"]),
    ("shoes", "men", 2, "حذاء رياضي أحمر وأبيض", "Kırmızı-Beyaz Spor Ayakkabı", "Red & White Athletic Shoes", 58.0, 72.0, 15, 4.5, 67, ["photo-1600185365483-26d7a4cc7519", "photo-1608231387042-66d1773070a5", "photo-1600185365926-3a2ce3cdb9eb"]),
    ("shoes", "women", 2, "حذاء رياضي ملون للمشي", "Renkli Yürüyüş Ayakkabısı", "Colorful Walking Sneakers", 49.0, None, 35, 4.1, 29, ["photo-1560769629-975ec94e6a86", "photo-1608231387042-66d1773070a5", "photo-1600185365926-3a2ce3cdb9eb"]),
    ("kitchen", "cookware", 1, "طقم أواني طبخ 5 قطع", "5 Parça Tencere Seti", "5-Piece Cookware Set", 89.0, 119.0, 20, 4.7, 143, ["photo-1584990347163-2b86b71390d6", "photo-1518291344630-4857135fb581", "photo-1556910602-38f53e68e15d"]),
    ("kitchen", "cookware", 1, "مقلاة غير لاصقة مع قدر", "Yapışmaz Tava ve Tencere", "Non-stick Pan & Pot Duo", 35.0, None, 45, 4.4, 88, ["photo-1518291344630-4857135fb581", "photo-1584990347163-2b86b71390d6"]),
    ("home", "storage-org", 1, "رفوف مطبخ خشبية مع أوانٍ", "Ahşap Mutfak Rafı Seti", "Wooden Kitchen Shelf Set", 75.0, None, 10, 4.3, 22, ["photo-1556910602-38f53e68e15d", "photo-1584990347163-2b86b71390d6"]),
    ("beauty", "personal-care", 1, "صابون الغار الحلبي التقليدي (6 قطع)", "Geleneksel Halep Defne Sabunu (6'lı)", "Traditional Aleppo Laurel Soap (6-Pack)", 12.0, 15.0, 120, 4.9, 412, ["photo-1546552768-9e3a94b38a59", "photo-1458538977777-0549b2370168"]),
    ("beauty", "perfume", 1, "عطر ماء الورد الشامي", "Şam Gülü Parfümü", "Damascene Rose Eau de Parfum", 38.0, None, 50, 4.6, 156, ["photo-1458538977777-0549b2370168", "photo-1523293182086-7651a899d37f"]),
    ("beauty", "perfume", 0, "عطر رجالي أزرق فاخر 100 مل", "Lüks Mavi Erkek Parfümü 100 ml", "Luxury Blue Men's Perfume 100ml", 69.0, 85.0, 25, 4.7, 201, ["photo-1523293182086-7651a899d37f", "photo-1458538977777-0549b2370168"]),
    ("food", "dates-nuts", 1, "تمر مجدول فاخر 1 كغ", "Premium Medjool Hurma 1 kg", "Premium Medjool Dates 1kg", 14.5, None, 200, 4.8, 320, ["photo-1648288725055-5ba4063355b9", "photo-1663505305791-87f2248df4ae"]),
    ("food", "coffee-tea", 1, "تشكيلة تمور وقهوة عربية", "Hurma ve Arap Kahvesi Seti", "Dates & Arabic Coffee Gift Set", 26.0, 34.0, 70, 4.7, 119, ["photo-1663505305791-87f2248df4ae", "photo-1648288725055-5ba4063355b9"]),
    ("food", "oils-spices", 1, "زيت زيتون بكر وبهارات شامية", "Sızma Zeytinyağı ve Şam Baharatları", "Virgin Olive Oil & Levantine Spices", 19.0, None, 90, 4.6, 84, ["photo-1690983323310-3f8e55c9272f", "photo-1648288725055-5ba4063355b9"]),
    # Same items offered by a second store -> "other sellers" comparison on the product page.
    ("shoes", "sports-shoes", 3, "حذاء رياضي أبيض كلاسيكي", "Klasik Beyaz Spor Ayakkabı", "Classic White Sneakers", 43.5, 55.0, 18, 4.4, 37, ["photo-1608231387042-66d1773070a5", "photo-1600185365483-26d7a4cc7519"]),
    ("electronics", "phones", 3, "هاتف ذكي 128 جيجا بكاميرا ثلاثية", "128 GB Üç Kameralı Akıllı Telefon", "128GB Smartphone with Triple Camera", 295.0, None, 9, 4.5, 41, ["photo-1759588071838-d560be56b2a2", "photo-1759588071790-9afb3fd61d23"]),
    ("beauty", "personal-care", 3, "صابون الغار الحلبي التقليدي (6 قطع)", "Geleneksel Halep Defne Sabunu (6'lı)", "Traditional Aleppo Laurel Soap (6-Pack)", 11.5, None, 60, 4.7, 58, ["photo-1546552768-9e3a94b38a59"]),
    ("fashion", "men", 3, "قميص صيفي قطني كاجوال", "Pamuklu Günlük Yazlık Gömlek", "Cotton Casual Summer Shirt", 27.9, None, 40, 4.3, 22, ["photo-1612423284934-2850a4ea6b0f"]),
    ("toys", "educational", 0, "مجموعة ألعاب تعليمية خشبية مع قطار", "Ahşap Trenli Eğitici Oyuncak Seti", "Wooden Educational Toy Set with Train", 32.0, 42.0, 30, 4.8, 64, ["photo-1545558014-8692077e9b5c", "photo-1535572290543-960a8046f5af"]),
    # New categories
    ("electronics", "headphones", 0, "سماعات لاسلكية بخاصية عزل الضوضاء", "Gürültü Önleyici Kablosuz Kulaklık", "Wireless Noise-Cancelling Headphones", 79.0, 99.0, 35, 4.7, 128, ["photo-1549206464-82c129240d11", "photo-1556196148-1fb724238998", "photo-1546435770-a3e426bf472b"]),
    ("electronics", "keyboards", 0, "طقم لوحة مفاتيح وفأرة لاسلكي", "Kablosuz Klavye & Mouse Seti", "Wireless Keyboard & Mouse Set", 39.0, None, 50, 4.5, 73, ["photo-1546435770-a3e426bf472b"]),
    ("home", "appliances", 3, "غسالة تحميل أمامي 8 كغ", "8 kg Önden Yüklemeli Çamaşır Makinesi", "Front-Load Washing Machine 8kg", 389.0, 429.0, 8, 4.6, 57, ["photo-1626806787461-102c1bfaaea1", "photo-1626806819282-2c1dc01a5e0c"]),
    ("home", "lighting", 1, "طقم ثريات نحاسية معلقة", "Bakır Sarkıt Avize Seti", "Copper Pendant Lamp Set", 59.0, None, 20, 4.5, 31, ["photo-1540932239986-30128078f3c5", "photo-1565814329452-e1efa11c5b89"]),
    ("office", "stationery", 3, "طقم أدوات مكتبية (آلة حاسبة، دباسة، أوراق)", "Ofis Kırtasiye Seti (hesap makinesi, zımba, not)", "Office Stationery Set (calculator, stapler, notes)", 18.5, 24.0, 75, 4.4, 46, ["photo-1654931800100-2ecf6eee7c64", "photo-1510070009289-b5bc34383727", "photo-1513077202514-c511b41bd4c7"]),
    ("garden", "tools", 1, "طقم أدوات حديقة مع قفازات", "Eldivenli Bahçe Aletleri Seti", "Garden Tool Set with Gloves", 27.0, None, 40, 4.6, 39, ["photo-1523301551780-cd17359a95d0", "photo-1416879595882-3373a0480b5b", "photo-1555955208-94f6fafea771"]),
    ("sports", "fitness", 3, "زوج دمبل سداسي 2×5 كغ", "Altıgen Dambıl Çifti 2×5 kg", "Hex Dumbbell Pair 2×5 kg", 34.0, 42.0, 45, 4.7, 88, ["photo-1638536532686-d610adfc8e5c", "photo-1584735935682-2f2b69dff9d2", "photo-1576678927484-cc907957088c"]),
    ("auto", "parts", 0, "طقم مساعدات رياضية (4 قطع)", "Spor Amortisör Seti (4 adet)", "Sport Coilover Suspension Kit (4 pcs)", 520.0, 580.0, 6, 4.5, 14, ["photo-1760836395716-7dd00b71311a", "photo-1666554498255-5250121b4865"]),
    ("auto", "parts", 3, "قطع عادم ومحول حفاز", "Egzoz ve Katalitik Konvertör", "Exhaust & Catalytic Converter Parts", 145.0, None, 12, 4.2, 9, ["photo-1759419281419-b04552b2691a", "photo-1666554498255-5250121b4865"]),
    ("hobbies", "music", 2, "غيتار أكوستيك 41 إنش مع حقيبة", "Çantalı 41\" Akustik Gitar", "41\" Acoustic Guitar with Gig Bag", 119.0, 139.0, 14, 4.8, 52, ["photo-1541689592655-f5f52825a3b8", "photo-1520167112707-56e25f2d7d6e", "photo-1510915361894-db8b60106cb1"]),
    ("toys", "building", 0, "مكعبات تركيب ملونة 1000 قطعة", "1000 Parça Renkli Yapı Blokları", "Colorful Building Bricks 1000 pcs", 24.0, 30.0, 55, 4.8, 141, ["photo-1587654780291-39c9404d746b", "photo-1618842676088-c4d48a6a7c9d"]),
    ("toys", "educational", 1, "مكعبات أحرف خشبية", "Ahşap Harf Küpleri", "Wooden Alphabet Blocks", 15.0, None, 60, 4.6, 47, ["photo-1535572290543-960a8046f5af", "photo-1618842676088-c4d48a6a7c9d"]),
]


async def main() -> None:
    await ensure_indexes()
    cat_ids: dict[str, str] = {}
    for i, (slug, icon, name, photo, size_type, subs) in enumerate(CATEGORIES):
        existing = await db.categories.find_one({"slug": slug}, {"_id": 0, "id": 1})
        cat = Category(slug=slug, icon=icon, name=name, image=img(photo), sort=i, size_type=size_type,
                       subcategories=[SubCategory(slug=s, name=n) for s, n in subs])
        if existing:
            cat.id = existing["id"]
        await db.categories.replace_one({"slug": slug}, cat.model_dump(), upsert=True)
        cat_ids[slug] = cat.id

    for uid, store, city in SELLERS:
        await db.users.update_one(
            {"user_id": uid},
            {"$set": {"role": "seller", "store_name": store, "city": city, "name": store,
                      "email": f"{uid}@seed.bazaron.local", "env": "seed"}},
            upsert=True,
        )

    rnd = random.Random(7)
    now = datetime.now(timezone.utc)
    for n, (slug, sub, s_idx, ar, tr, en, price, old, stock, rating, reviews, photos) in enumerate(PRODUCTS):
        pid = f"seed-product-{n + 1:02d}"
        uid, store, city = SELLERS[s_idx]
        desc = I18nText(
            ar=f"{ar} — منتج أصلي بجودة عالية، توصيل سريع إلى جميع المحافظات السورية.",
            tr=f"{tr} — Orijinal ve yüksek kaliteli ürün, tüm Suriye illerine hızlı teslimat.",
            en=f"{en} — Genuine, high-quality product with fast delivery across all Syrian governorates.",
        )
        product = Product(
            id=pid, seller_id=uid, store_name=store, city=city, category_id=cat_ids[slug], subcategory=sub,
            title=I18nText(ar=ar, tr=tr, en=en), description=desc, price=price, old_price=old,
            stock=stock, images=[img(p) for p in photos], sizes=SIZES.get(slug, []), rating=rating, reviews_count=reviews,
            sold_count=rnd.randint(20, 900), created_at=now - timedelta(hours=n * 7),
        )
        existing = await db.products.find_one({"id": pid}, {"_id": 0, "stock": 1, "sold_count": 1, "rating": 1, "reviews_count": 1})
        doc = product.model_dump()
        if existing:  # keep live counters (stock, sales, real reviews) on re-seed
            doc.update({k: existing[k] for k in ("stock", "sold_count", "rating", "reviews_count") if k in existing})
        await db.products.replace_one({"id": pid}, doc, upsert=True)

    await db.settings.update_one(
        {"key": "global"},
        {"$setOnInsert": {"key": "global", "exchange_rate": 110, "shipping_fee": 2.0, "free_shipping_over": 50.0}},
        upsert=True,
    )
    # Syrian pound redenomination (two zeros removed): migrate the old default rate once.
    await db.settings.update_one({"key": "global", "exchange_rate": 11000}, {"$set": {"exchange_rate": 110}})
    print(f"seeded {len(CATEGORIES)} categories, {len(SELLERS)} stores, {len(PRODUCTS)} products")


if __name__ == "__main__":
    asyncio.run(main())
