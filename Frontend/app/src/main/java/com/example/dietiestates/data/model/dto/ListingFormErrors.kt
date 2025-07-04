package com.example.dietiestates.data.model.dto

data class ListingFormErrors(
    val address: String? = null,
    val title: String? = null,
    val municipality: String? = null,
    val postalCode: String? = null,
    val province: String? = null,
    val size: String? = null,
    val description: String? = null,
    val price: String? = null,
    val images: String? = null,
    val agentId: String? = null
)