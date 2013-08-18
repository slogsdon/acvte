package models

import (
    _ "github.com/robfig/revel"
    "time"
)

// Table name: users
type User struct {
    Id                              int32          `json:"id" qbs:"pk,notnull"`
    Username                        string         `json:"username" qbs:"notnull"`
    Email                           string         `json:"email"`
    CryptedPassword                 string         `json:"crypted_password"`
    Salt                            string         `json:"salt"`
    CreatedAt                       time.Time      `json:"created_at" qbs:"notnull,created"`
    UpdatedAt                       time.Time      `json:"updated_at" qbs:"notnull,updated"`
    RememberMeToken                 string         `json:"remember_me_token"`
    RememberMeTokenExpiresAt        time.Time      `json:"remember_me_token_expires_at"`
    ResetPasswordToken              string         `json:"reset_password_token"`
    ResetPasswordTokenExpiresAt     time.Time      `json:"reset_password_token_expires_at"`
    ResetPasswordEmailSentAt        time.Time      `json:"reset_password_email_sent_at"`
    LastLoginAt                     time.Time      `json:"last_login_at"`
    LastLogoutAt                    time.Time      `json:"last_logout_at"`
    LastActivityAt                  time.Time      `json:"last_activity_at"`
    FailedLoginsCount               int32          `json:"failed_logins_count" qbs:"default:'0'"`
    LockExpiresAt                   time.Time      `json:"lock_expires_at"`
}