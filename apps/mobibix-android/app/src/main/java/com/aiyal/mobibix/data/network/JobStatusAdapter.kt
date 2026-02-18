package com.aiyal.mobibix.data.network

import com.aiyal.mobibix.model.JobStatus
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonParseException
import java.lang.reflect.Type

class JobStatusAdapter : JsonDeserializer<JobStatus> {
    @Throws(JsonParseException::class)
    override fun deserialize(json: JsonElement, typeOfT: Type, context: JsonDeserializationContext): JobStatus {
        return try {
            JobStatus.valueOf(json.asString)
        } catch (e: IllegalArgumentException) {
            // Handle unknown status gracefully, perhaps default to a known state or throw an exception
            JobStatus.RECEIVED // Default to RECEIVED if status is unknown
        }
    }
}
