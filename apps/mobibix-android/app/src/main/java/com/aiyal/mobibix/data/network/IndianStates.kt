package com.aiyal.mobibix.data.network

data class IndianState(
    val code: String,
    val name: String,
    val gstCode: String
)

val INDIAN_STATES = listOf(
    IndianState("JK", "Jammu and Kashmir", "01"),
    IndianState("HP", "Himachal Pradesh", "02"),
    IndianState("PB", "Punjab", "03"),
    IndianState("CH", "Chandigarh", "04"),
    IndianState("UT", "Uttarakhand", "05"),
    IndianState("HR", "Haryana", "06"),
    IndianState("DL", "Delhi", "07"),
    IndianState("RJ", "Rajasthan", "08"),
    IndianState("UP", "Uttar Pradesh", "09"),
    IndianState("BR", "Bihar", "10"),
    IndianState("SK", "Sikkim", "11"),
    IndianState("AR", "Arunachal Pradesh", "12"),
    IndianState("NL", "Nagaland", "13"),
    IndianState("MN", "Manipur", "14"),
    IndianState("MZ", "Mizoram", "15"),
    IndianState("TR", "Tripura", "16"),
    IndianState("ML", "Meghalaya", "17"),
    IndianState("AS", "Assam", "18"),
    IndianState("WB", "West Bengal", "19"),
    IndianState("JH", "Jharkhand", "20"),
    IndianState("OR", "Odisha", "21"),
    IndianState("CT", "Chhattisgarh", "22"),
    IndianState("MP", "Madhya Pradesh", "23"),
    IndianState("GJ", "Gujarat", "24"),
    IndianState("DD", "Daman and Diu", "25"),
    IndianState("DN", "Dadra and Nagar Haveli", "26"),
    IndianState("MH", "Maharashtra", "27"),
    IndianState("KA", "Karnataka", "29"),
    IndianState("GA", "Goa", "30"),
    IndianState("LD", "Lakshadweep", "31"),
    IndianState("KL", "Kerala", "32"),
    IndianState("TN", "Tamil Nadu", "33"),
    IndianState("PY", "Puducherry", "34"),
    IndianState("AN", "Andaman and Nicobar Islands", "35"),
    IndianState("TS", "Telangana", "36"),
    IndianState("AP", "Andhra Pradesh", "37"),
    IndianState("LA", "Ladakh", "38")
)
