import { useState, useEffect } from 'react'

const AUTHORIZED_PINS = ['1234', '5678', '9999']
const STORAGE_KEY = 'sahyog_auth'

export function useAuth() {
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [showPinModal, setShowPinModal] = useState(false)

    useEffect(() => {
        const saved = sessionStorage.getItem(STORAGE_KEY)
        if (saved === 'true') setIsAuthorized(true)
    }, [])

    function login() {
        setShowPinModal(true)
    }

    function handlePinSuccess() {
        setIsAuthorized(true)
        setShowPinModal(false)
        sessionStorage.setItem(STORAGE_KEY, 'true')
    }

    function handlePinClose() {
        setShowPinModal(false)
    }

    function logout() {
        setIsAuthorized(false)
        sessionStorage.removeItem(STORAGE_KEY)
    }

    return {
        isAuthorized,
        login,
        logout,
        showPinModal,
        handlePinSuccess,
        handlePinClose,
    }
}