import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt.android.plugin)
    alias(libs.plugins.google.services.plugin)
    alias(libs.plugins.ksp)
    alias(libs.plugins.crashlytics.plugin)
}

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")
if (localPropertiesFile.exists()) {
    localProperties.load(localPropertiesFile.inputStream())
}

android {
    namespace = "com.aiyal.mobibix"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.aiyal.mobibix"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField(
            "String",
            "API_BASE_URL",
            "\"${localProperties.getProperty("API_BASE_URL") ?: "https://REMOVED_ENDPOINT/"}\"" // TODO: update fallback to MobiBix prod domain when provisioned
        )
        buildConfigField(
            "String",
            "PUBLIC_BASE_URL",
            "\"${localProperties.getProperty("PUBLIC_BASE_URL") ?: "https://mobibix-api.onrender.com"}\""
        )
    }

    signingConfigs {
        create("release") {
            storeFile = file("mobibix-release.keystore")
            storePassword = localProperties.getProperty("KEYSTORE_PASSWORD") ?: System.getenv("KEYSTORE_PASSWORD") ?: ""
            keyAlias = localProperties.getProperty("KEY_ALIAS") ?: System.getenv("KEY_ALIAS") ?: "mobibix"
            keyPassword = localProperties.getProperty("KEY_PASSWORD") ?: System.getenv("KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        debug {
            // Test key — safe for development; no real charges
            buildConfigField("String", "RAZORPAY_KEY_ID", "\"rzp_test_SNqtvsjJcexKNP\"")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("release")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Live key — used in production; backend also returns this key
            buildConfigField("String", "RAZORPAY_KEY_ID", "\"rzp_live_RxqXZcZmLfgGqB\"")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    lint {
        disable.add("InvalidSetHasFixedSize")
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.compose)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.runtime.livedata)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.material.icons.extended)

    // Hilt
    implementation(libs.hilt.android)
    implementation(libs.androidx.ui)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)

    // Retrofit & OkHttp
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging.interceptor)

    // Navigation Compose
    implementation(libs.navigation.compose)

    // DataStore & Security
    implementation(libs.datastore.preferences)
    implementation(libs.androidx.security.crypto)
    implementation(libs.androidx.biometric)
    implementation(libs.REMOVED_AUTH_PROVIDER.messaging)

    // Firebase
    implementation(platform(libs.REMOVED_AUTH_PROVIDER.bom))
    implementation(libs.REMOVED_AUTH_PROVIDER.auth)
    implementation(libs.REMOVED_AUTH_PROVIDER.crashlytics)

    // reCAPTCHA Enterprise — required when Firebase "Email enumeration protection" is enabled
    implementation("com.google.android.recaptcha:recaptcha:18.4.0")
    
    // Credential Manager
    implementation(libs.credentials)
    implementation(libs.credentials.play.services.auth)
    implementation(libs.googleid)

    // QR Code
    implementation(libs.zxing.core)

    // CameraX
    implementation(libs.androidx.camera.core)
    implementation(libs.androidx.camera.camera2)
    implementation(libs.androidx.camera.lifecycle)
    implementation(libs.androidx.camera.view)
    implementation(libs.androidx.camera.mlkit.vision)

    // ML Kit
    implementation(libs.mlkit.barcode.scanning)

    // Accompanist
    implementation(libs.accompanist.permissions)

    // Vico Charts
    implementation(libs.vico.compose)
    implementation(libs.vico.compose.m3)
    implementation(libs.vico.core)
    implementation(libs.REMOVED_PAYMENT_INFRA.checkout)

    // Room Database
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}