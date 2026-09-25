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
  FiMapPin,
  FiPlus,
} from "react-icons/fi";

function MessagesContent() {
  const { user, loadingAuth } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();

  const targetUserId = searchParams.get("user_id");
  const targetListingId = searchParams.get("listing_id");

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileChat, setShowMobileChat] = useState(false);

  // Supabase ilike axtarış state-ləri
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);

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
            setActiveChatUser(found.other_user);
            setShowMobileChat(true);
          } else {
            // Hələ söhbət yoxdur, virtual olaraq aktivləşdiririk
            setActiveConvId("new_conversation");
            // Rieltorun məlumatını axtarışdan və ya birbaşa gətiririk
            fetch(`/api/users/search?q=${encodeURIComponent(targetUserId)}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.data?.[0]) setActiveChatUser(d.data[0]);
              })
              .catch(() => {});
            setShowMobileChat(true);
          }
        } else if (json.data.length > 0 && !activeConvId) {
          setActiveConvId(json.data[0].id);
          setActiveChatUser(json.data[0].other_user);
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

  // 2. Supabase Profiles üzrə ilike sorğusu (Rieltor və istifadəçi adları)
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchTerm.trim())}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Öz profilini çıxarırıq
          setSearchResults(json.data.filter((u) => String(u.id) !== String(user?.id)));
        } else {
          setSearchResults([]);
        }
      } catch (err) {
        console.warn("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, user]);

  // 3. Aktiv söhbətin mesajlarını yüklə
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
    const interval = setInterval(fetchMessages, 6000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeConvId, user]);

  // Avtomatik aşağı sürüşdür
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Yeni söhbət başlat (axtarışdan seçildikdə)
  const handleSelectSearchedUser = (selectedUser) => {
    // Artıq söhbət varmı?
    const existing = conversations.find((c) =>
      c.participant_ids?.includes(selectedUser.id)
    );
    if (existing) {
      setActiveConvId(existing.id);
      setActiveChatUser(existing.other_user);
    } else {
      setActiveConvId("new_conversation");
      setActiveChatUser(selectedUser);
      setMessages([]);
    }
    setShowMobileChat(true);
  };

  // Mesaj göndərmə
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || sending || !user) return;

    const textToSend = newMessageText.trim();
    setNewMessageText("");
    setSending(true);

    const activeConv = conversations.find((c) => c.id === activeConvId);
    const receiverId =
      activeChatUser?.id ||
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
          sender_name: user?.full_name || user?.user_metadata?.full_name || "Müştəri",
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
  const currentChatUser = activeChatUser || activeConv?.other_user;

  // Qonaq istifadəçi vəziyyəti
  if (!loadingAuth && !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#F8FAFC] dark:bg-slate-950">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-slate-900 border border-navy/10 dark:border-slate-800 text-center shadow-card space-y-4">
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
              className="px-6 py-2.5 rounded-xl border border-navy/20 dark:border-slate-700 text-navy dark:text-slate-200 text-xs font-bold hover:border-copper transition"
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
    const agency = c.other_user?.agency_name || "";
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agency.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-140px)]">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-navy/10 dark:border-slate-800 shadow-sm overflow-hidden flex h-[750px] relative">
        
        {/* Sol Panel: Söhbətlər və Supabase Axtarışı */}
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
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy/40 dark:text-slate-500 text-xs" />
              <input
                type="text"
                placeholder="Rieltor və ya istifadəçi axtar (ilike)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper transition"
              />
            </div>
          </div>

          {/* Siyahı: Supabase Axtarış Nəticələri + Aktiv Söhbətlər */}
          <div className="flex-1 overflow-y-auto divide-y divide-navy/5 dark:divide-slate-800/60">
            {/* Supabase ilike Sorğu Nəticələri (Tapılan Rieltorlar/İstifadəçilər) */}
            {searchResults.length > 0 && (
              <div className="p-2 bg-copper/5 border-b border-copper/10">
                <p className="px-2 py-1 text-[11px] font-bold text-copper uppercase tracking-wider flex items-center justify-between">
                  <span>Bazada Tapılanlar ({searchResults.length})</span>
                  {searching && <span className="text-[10px] lowercase font-normal">axtarılır...</span>}
                </p>
                <div className="space-y-1 mt-1">
                  {searchResults.map((sr) => (
                    <button
                      key={sr.id}
                      type="button"
                      onClick={() => handleSelectSearchedUser(sr)}
                      className="w-full p-2 rounded-xl hover:bg-white dark:hover:bg-slate-800 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-navy/10 dark:bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                          {sr.avatar_url ? (
                            <img src={sr.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{sr.full_name?.[0] || "U"}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-navy dark:text-slate-100 truncate">
                            {sr.full_name}
                          </p>
                          <p className="text-[10px] text-navy/50 dark:text-slate-400 truncate">
                            {sr.agency_name || (sr.role === "realtor" ? "Rieltor" : "Müştəri")}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-copper flex items-center gap-0.5 shrink-0 ml-2">
                        <FiPlus /> Yaz
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mövcud Söhbətlər */}
            {loadingList ? (
              <div className="p-8 text-center text-xs text-navy/50 dark:text-slate-400">
                Söhbətlər yüklənir...
              </div>
            ) : filteredConversations.length === 0 && searchResults.length === 0 ? (
              <div className="p-8 text-center text-xs text-navy/50 dark:text-slate-400 space-y-2">
                <p>Axtarışa uyğun söhbət tapılmadı.</p>
                <p className="text-[11px] text-navy/40">
                  Yuxarıdakı axtarış xanasına rieltorun adını yazıb birbaşa yeni çat başlada bilərsiniz.
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
                      setActiveChatUser(conv.other_user);
                      setShowMobileChat(true);
                    }}
                    className={`w-full p-3.5 text-left flex items-start gap-3 transition cursor-pointer ${
                      isActive
                        ? "bg-copper/10 dark:bg-slate-800/90 border-l-4 border-copper"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="relative w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden border border-navy/5">
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
                      <p className="text-xs text-navy/60 dark:text-slate-400 truncate">
                        {conv.last_message || "Yeni söhbət başlandı"}
                      </p>
                      {conv.other_user?.agency_name && (
                        <span className="text-[10px] text-copper font-medium block truncate mt-0.5">
                          {conv.other_user.agency_name}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Sağ Panel: Aktiv Söhbət Pəncərəsi */}
        <div
          className={`flex-1 flex flex-col h-full bg-[#FAFAFA] dark:bg-slate-950 ${
            showMobileChat ? "flex" : "hidden md:flex"
          }`}
        >
          {activeConvId ? (
            <>
              {/* Çat Header */}
              <div className="p-4 border-b border-navy/10 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-navy dark:text-white"
                  >
                    <FiArrowLeft className="text-lg" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-navy/10">
                    {currentChatUser?.avatar_url ? (
                      <img
                        src={currentChatUser.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FiUser className="text-navy/50 dark:text-slate-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-navy dark:text-white flex items-center gap-1.5">
                      {currentChatUser?.full_name || "MÜLKERA Əlaqəsi"}
                      <FiCheckCircle className="text-emerald-500 text-xs" />
                    </h3>
                    <p className="text-[11px] text-navy/50 dark:text-slate-400">
                      {currentChatUser?.agency_name || (currentChatUser?.role === "realtor" ? "Lisenziyalı Rieltor" : "Aktiv istifadəçi")}
                    </p>
                  </div>
                </div>

                {currentChatUser?.id && (
                  <Link
                    href={`/realtors/${currentChatUser.id}`}
                    className="text-xs font-bold text-copper hover:underline inline-flex items-center gap-1"
                  >
                    Profilə bax <FiExternalLink className="text-[10px]" />
                  </Link>
                )}
              </div>

              {/* Mesaj Siyahısı */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="py-12 text-center text-xs text-navy/40 dark:text-slate-500">
                    Mesajlar yüklənir...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-12 text-center text-xs text-navy/40 dark:text-slate-500 space-y-2">
                    <p>Bu söhbətdə hələ heç bir mesaj yoxdur.</p>
                    <p className="text-[11px]">İlk salamı siz göndərin!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMine = String(m.sender_id) === String(user?.id);
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                            isMine
                              ? "bg-navy dark:bg-copper text-white rounded-tr-none"
                              : "bg-white dark:bg-slate-800 text-navy dark:text-slate-100 border border-navy/5 dark:border-slate-700 rounded-tl-none"
                          }`}
                        >
                          <p className="break-words">{m.text || m.content}</p>
                        </div>
                        <span className="text-[9px] text-navy/35 dark:text-slate-500 mt-1 px-1">
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

              {/* Mesaj Göndərmə Formu */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white dark:bg-slate-900 border-t border-navy/10 dark:border-slate-800 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Mesajınızı yazın..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-navy/10 dark:border-slate-700 text-xs text-navy dark:text-slate-100 outline-none focus:border-copper transition"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="px-5 py-2.5 rounded-2xl bg-navy dark:bg-copper hover:bg-copper dark:hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <FiSend className="text-xs" />
                  <span className="hidden sm:inline">Göndər</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-navy/50 dark:text-slate-500 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl text-copper">
                <FiMessageSquare />
              </div>
              <h3 className="text-base font-bold text-navy dark:text-slate-200">
                Söhbət seçin və ya axtarın
              </h3>
              <p className="text-xs max-w-sm">
                Sol paneldəki söhbətlərdən birinə klikləyin və ya axtarış vasitəsilə rieltor tapıb mesaj yazın.
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
    <Suspense fallback={<div className="py-20 text-center text-xs font-medium">Yüklənir...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
