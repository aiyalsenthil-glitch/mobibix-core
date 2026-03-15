package com.aiyal.mobibix.core.payment

import android.app.Activity
import com.REMOVED_PAYMENT_INFRA.Checkout
import com.REMOVED_PAYMENT_INFRA.PaymentResultListener
import org.json.JSONObject

class RazorpayHelper(
    private val activity: Activity,
    private val onPaymentSuccess: (String) -> Unit,
    private val onPaymentError: (Int, String) -> Unit
) : PaymentResultListener {

    init {
        Checkout.preload(activity.applicationContext)
    }

    fun startPayment(
        key: String,
        orderId: String,
        amount: Int,
        currency: String = "INR",
        name: String = "MobiBix SaaS",
        description: String = "Subscription Upgrade"
    ) {
        val checkout = Checkout()
        checkout.setKeyID(key)
        
        try {
            val options = JSONObject()
            options.put("name", name)
            options.put("description", description)
            options.put("order_id", orderId)
            options.put("theme.color", "#4F46E5")
            options.put("currency", currency)
            options.put("amount", amount)
            
            // Optional prefill can be added here
            
            checkout.open(activity, options)
        } catch (e: Exception) {
            onPaymentError(-1, e.message ?: "Error in starting Razorpay payment")
        }
    }

    override fun onPaymentSuccess(REMOVED_PAYMENT_INFRAPaymentId: String?) {
        onPaymentSuccess(REMOVED_PAYMENT_INFRAPaymentId ?: "")
    }

    override fun onPaymentError(code: Int, response: String?) {
        onPaymentError(code, response ?: "Payment Failed")
    }
}
