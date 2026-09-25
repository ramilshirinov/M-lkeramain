"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import {
  FiSend,
  FiUser,
  FiMessageSquare,
  FiSearch,
  FiHome,
  FiExternalLink,
  FiClock,
  FiCheck,
  FiCheckCircle,
  FiArrowLeft,
} from "react-icons/fi";

function MessagesContent() {
  const { user, loadingAuth } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const targetUserId = searchParams.get("user_id");
  const targetListingId = searchParams.get("listing_id");

  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Realtor və İstifadəçiləri Axtarış üçün yükləyirik
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/users");
        const json = await res.json();
        if (json.data) setAllUsers(json.data);
      } catch (err) {
        console.error("İstifadəçilər yüklənmədi:", err);
      }
    }
    fetchUsers();
  }, []);

  const messagesEndRef = useRef(null);

  // 1. Söhbətlər siyahısını yüklə
  const loadConversations = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/messages?user_id=${user.id}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        setConversations(json.data);

        // Əgər URL-dən spesifik söhbət və ya user gəlibsə
        if (targetUserId) {
          const found = json.data.find(
            (c) =>
              c.participant_ids?.includes(targetUserId) &&
              (!targetListingId || String(c.listing_id) === String(targetListingId))
          );
          if (found) {
            setActiveConvId(found.id);
            setShowMobileChat(true);
          } else {
            // Hələ söhbət yoxdur, virtual olaraq aktivləşdiririk
            setActiveConvId("new_conversation");
            setShowMobileChat(true);
          }
        } else if (json.data.length > 0 && !activeConvId) {
          setActiveConvId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error("Söhbətlər yüklənmədi:", err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && user) {
      loadConversations();
    } else if (!loadingAuth && !user) {
      setLoadingList(false);
    }
  }, [loadingAuth, user, targetUserId, targetListingId]);

  // 2. Aktiv söhbətin mesajlarını yüklə
  useEffect(() => {
    if (!activeConvId || activeConvId === "new_conversation") {
      if (activeConvId === "new_conversation") setMessages([]);
      return;
    }

    let isSubscribed = true;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/messages?conversation_id=${activeConvId}`, { cache: "no-store" });
        const json = await res.json();
        if (isSubscribed && json.success) {
          setMessages(json.data || []);
          // Oxunmuş kimi işarələ
          if (user?.id) {
            fetch("/api/messages", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversationId: activeConvId, userId: user.id }),
            });
          }
        }
      } catch (err) {
        console.error("Mesajlar yüklənmədi:", err);
      } finally {
        if (isSubscribed) setLoadingMessages(false);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 6000); // 6 saniyədən bir polling

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeConvId, user]);

  // Avtomatik aşağı sürüşdür
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mesaj göndərmə
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || sending || !user) return;

    const textToSend = newMessageText.trim();
    setNewMessageText("");
    setSending(true);

    const activeConv = conversations.find((c) => c.id === activeConvId);
    const receiverId =
      targetUserId ||
      (activeConv?.participant_ids || []).find((id) => String(id) !== String(user.id));

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId === "new_conversation" ? null : activeConvId,
          senderId: user.id,
          receiverId,
          listingId: activeConv?.listing_id || targetListingId || null,
          text: textToSend,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const { conversation, message } = json.data;
        setMessages((prev) => [...prev, message]);
        setActiveConvId(conversation.id);
        loadConversations();
      }
    } catch (err) {
      console.error("Mesaj göndərilmədi:", err);
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Qonaq istifadəçi vəziyyəti
  if (!loadingAuth && !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 text-center shadow-card space-y-4">
          <div className="w-16 h-16 rounded-full bg-copper/10 text-copper flex items-center justify-center mx-auto text-3xl">
            <FiMessageSquare />
          </div>
          <h2 className="text-2xl font-bold font-heading text-navy dark:text-white">
            MÜLKERA Çat və Mesajlaşma
          </h2>
          <p className="text-xs text-navy/60 dark:text-slate-400">
            Elan sahibləri və lisenziyalı rieltorlarla birbaşa əlaqə saxlamaq və suallarınızı vermək üçün hesabınıza daxil olun.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login?redirect=/messages"
              className="px-6 py-2.5 rounded-xl bg-navy text-white hover:bg-copper text-xs font-bold transition shadow-sm"
            >
              Daxil Ol
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 rounded-xl border border-navy/20 dark:border-slate-700 text-navy dark:text-slate-200 text-xs font-bold hover:border-gold transition"
            >
              Qeydiyyatdan Keç
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredConversations = conversations.filter((c) => {
    const name = c.other_user?.full_name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const searchedUsers = searchTerm.trim()
    ? allUsers.filter(
        (u) =>
          u.id !== user?.id &&
          (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-140px)]">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-navy/10 dark:border-slate-800 shadow-sm overflow-hidden flex h-[750px] relative">
        
        {/* Sol Panel: Söhbətlər Siyahısı */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-navy/10 dark:border-slate-800 flex flex-col shrink-0 ${
            showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header & Axtarış */}
          <div className="p-4 border-b border-navy/10 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-heading text-navy dark:text-white flex items-center gap-2">
                <FiMessageSquare className="text-copper" /> Mesajlar
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-navy/70 dark:text-slate-300">
                {conversations.length} söhbət
              </span>
            </div>

            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-navy/40 dark:text-slate-500 text-sm" />
              <input
                type="text"
                placeholder="Rieltor və ya istifadəçi adı ilə axtar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none placeholder:text-navy/40"
              />
            </div>
          </div>

          {/* Siyahı */}
          <div className="flex-1 overflow-y-auto divide-y divide-navy/5 dark:divide-slate-800/60">
            {searchTerm.trim() && searchedUsers.length > 0 && (
              <div className="p-2 bg-copper/5">
                <p className="text-[11px] font-bold text-copper px-3 py-1">Axtarış Nəticələri (İstifadəçi & Rieltorlar)</p>
                {searchedUsers.map((usr) => (
                  <button
                    key={usr.id}
                    type="button"
                    onClick={() => {
                      router.push(`/messages?user_id=${usr.id}`);
                      setSearchTerm("");
                    }}
                    className="w-full p-2.5 text-left flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {usr.avatar_url ? (
                        <img src={usr.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <FiUser className="text-xs text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-navy dark:text-white truncate">{usr.full_name}</p>
                      <p className="text-[10px] text-navy/50 dark:text-slate-400 truncate">
                        {usr.role === "realtor" ? `Rieltor (${usr.agency_name || "MÜLKERA"})` : "Müştəri"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {loadingList ? (
              <div className="p-8 text-center text-xs text-navy/50 dark:text-slate-400">
                Söhbətlər yüklənir...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-navy/50 dark:text-slate-400 space-y-2">
                <p>Hələ aktiv söhbətiniz yoxdur.</p>
                <p className="text-[11px] text-navy/40">
                  Yuxarıdakı axtarış xanasından rieltorların adını yazaraq birbaşa çata başlaya bilərsiniz.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setShowMobileChat(true);
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                      isActive
                        ? "bg-copper/10 dark:bg-slate-800/90 border-l-4 border-copper"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="relative w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {conv.other_user?.avatar_url ? (
                        <img
                          src={conv.other_user.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FiUser className="text-lg text-slate-500" />
                      )}
                      {conv.unread_count > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-copper text-white text-[9px] font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-navy dark:text-white truncate">
                          {conv.other_user?.full_name || "İstifadəçi"}
                        </h4>
                        <span className="text-[10px] text-navy/40 dark:text-slate-500 shrink-0">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>

                      <p className="text-[11px] text-navy/60 dark:text-slate-400 truncate">
                        {conv.last_message || "Yeni söhbət"}
                      </p>

                      {conv.listing && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-semibold text-copper truncate max-w-full">
                          <FiHome className="shrink-0" /> {conv.listing.title_az || "Əmlak haqqında"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Sağ Panel: Aktiv Çat Paneli */}
        <div
          className={`flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 ${
            !showMobileChat ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConvId ? (
            <>
              {/* Çat Başlığı */}
              <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-b border-navy/10 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-1.5 rounded-lg text-navy dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <FiArrowLeft className="text-lg" />
                  </button>

                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                    {activeConv?.other_user?.avatar_url ? (
                      <img
                        src={activeConv.other_user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="text-base text-slate-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-navy dark:text-white truncate">
                      {activeConv?.other_user?.full_name || "İstifadəçi"}
                    </h3>
                    <p className="text-[11px] text-navy/50 dark:text-slate-400 truncate">
                      {activeConv?.other_user?.agency_name || "MÜLKERA platformasında əlaqə"}
                    </p>
                  </div>
                </div>

                {/* Əlaqəli Əmlak Kartı (Əgər varsa) */}
                {activeConv?.listing && (
                  <Link
                    href={`/listings/${activeConv.listing.id}`}
                    target="_blank"
                    className="hidden sm:flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:border-gold/40 border border-transparent transition text-xs max-w-xs truncate"
                  >
                    {activeConv.listing.listing_photos?.[0]?.url && (
                      <img
                        src={activeConv.listing.listing_photos[0].url}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-[11px] text-navy dark:text-white truncate">
                        {activeConv.listing.title_az}
                      </p>
                      <p className="text-[10px] text-copper font-bold">
                        {Number(activeConv.listing.price).toLocaleString()} AZN
                      </p>
                    </div>
                  </Link>
                )}
              </div>

              {/* Mesaj Axını */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="text-center py-10 text-xs text-navy/40 dark:text-slate-500">
                    Mesajlar oxunur...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 space-y-2">
                    <FiMessageSquare className="text-3xl text-copper/40 mx-auto" />
                    <p className="text-xs text-navy/60 dark:text-slate-400 font-medium">
                      Bu istifadəçi ilə hələ mesaj yoxdur.
                    </p>
                    <p className="text-[11px] text-navy/40 dark:text-slate-500">
                      İlk mesajı göndərərək mülk haqqında suallarınızı verin.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = String(m.sender_id) === String(user?.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? "bg-navy text-white rounded-br-none dark:bg-copper"
                              : "bg-white dark:bg-slate-800 text-navy dark:text-slate-100 rounded-bl-none border border-navy/5 dark:border-slate-700"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words font-medium">{m.text}</p>
                        </div>
                        <span className="text-[9px] text-navy/40 dark:text-slate-500 mt-1 px-1">
                          {m.created_at
                            ? new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Mesaj Daxiletmə Sahəsi */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-900 border-t border-navy/10 dark:border-slate-800 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Mesajınızı yazın..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-gold transition font-medium"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="inline-flex items-center justify-center p-3 rounded-xl bg-navy text-white hover:bg-copper transition shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  <FiSend className="text-sm" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-navy/50 dark:text-slate-400 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl text-copper">
                <FiMessageSquare />
              </div>
              <h3 className="text-base font-bold text-navy dark:text-white">
                Söhbət Seçin
              </h3>
              <p className="text-xs max-w-xs">
                Mesajlaşmaya başlamaq üçün sol paneldən söhbət seçin və ya elan səhifələrindən əlaqə yaradın.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-950">
          <div className="w-10 h-10 border-4 border-copper border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
