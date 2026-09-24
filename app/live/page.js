"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { getLiveKitToken } from "@/lib/liveStreams";
import {
  FiRadio,
  FiUsers,
  FiClock,
  FiSend,
  FiHeart,
  FiAward,
  FiExternalLink,
  FiPhone,
  FiMessageCircle,
  FiZap,
  FiCheckCircle,
  FiPlus,
  FiX
} from "react-icons/fi";

const GIFTS = [
  { id: "coffee", name: "Qəhvə", icon: "☕", price: 2, points: 20 },
  { id: "key", name: "Qızıl Açar", icon: "🔑", price: 5, points: 50 },
  { id: "villa", name: "Lüks Villa", icon: "🏠", price: 20, points: 200 },
  { id: "diamond", name: "Brilliant", icon: "💎", price: 50, points: 500 },
  { id: "crown", name: "Mülkera Tacı", icon: "👑", price: 100, points: 1000 },
];

export default function LivePage() {
  const { user } = useApp();
  const [streams, setStreams] = useState([]);
  const [activeStream, setActiveStream] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat və Interaksiya
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [selectedSide, setSelectedSide] = useState("left");
  const [floatingGifts, setFloatingGifts] = useState([]);
  const [showNewStreamModal, setShowNewStreamModal] = useState(false);

  // Yeni yayım formu
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isPkMode, setIsPkMode] = useState(true);

  const chatEndRef = useRef(null);
  const leftVideoRef = useRef(null);
  const rightVideoRef = useRef(null);
  const liveKitRoomRef = useRef(null);
  const [videoConnected, setVideoConnected] = useState(false);
  const [videoError, setVideoError] = useState("");

  // Real LiveKit (WebRTC) qoşulması: aktiv yayımın room-una qoşulur,
  // ev sahibinin/rəqibin videosunu sol/sağ panellərə bağlayır.
  useEffect(() => {
    const roomName = activeStream?.room_name;
    if (!roomName) return;

    let cancelled = false;
    let room = null;

    const myRole =
      user?.id && activeStream.host_id === user.id
        ? "host"
        : user?.id && activeStream.rival_id === user.id
        ? "rival"
        : "viewer";
    const identity = user?.id ? `${myRole}-${user.id}` : `viewer-${Math.random().toString(36).slice(2, 10)}`;
    const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Qonaq";

    const attachTrack = (track, participant) => {
      if (track.kind !== "video") return;
      let role = "viewer";
      try {
        role = JSON.parse(participant.metadata || "{}").role || "viewer";
      } catch (e) {
        /* no-op */
      }
      const target = role === "host" ? leftVideoRef.current : role === "rival" ? rightVideoRef.current : null;
      if (!target) return;
      target.innerHTML = "";
      const el = track.attach();
      el.autoplay = true;
      el.playsInline = true;
      if (participant.isLocal) el.muted = true;
      target.appendChild(el);
      setVideoConnected(true);
    };

    (async () => {
      try {
        const { token, wsUrl, canPublish } = await getLiveKitToken({
          roomName,
          identity,
          name: displayName,
          role: myRole,
        });
        if (cancelled) return;

        const { Room, RoomEvent } = await import("livekit-client");
        room = new Room({ adaptiveStream: true, dynacast: true });
        liveKitRoomRef.current = room;

        room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => attachTrack(track, participant));

        await room.connect(wsUrl, token);
        if (cancelled) {
          room.disconnect();
          return;
        }

        room.remoteParticipants.forEach((participant) => {
          participant.videoTrackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track, participant);
          });
        });

        if (canPublish) {
          await room.localParticipant.setCameraEnabled(true);
          await room.localParticipant.setMicrophoneEnabled(true);
          room.localParticipant.videoTrackPublications.forEach((pub) => {
            if (pub.track) attachTrack(pub.track, room.localParticipant);
          });
        }
      } catch (err) {
        console.warn("LiveKit video qoşulmadı:", err.message);
        setVideoError(err.message);
      }
    })();

    return () => {
      cancelled = true;
      setVideoConnected(false);
      if (room) {
        try {
          room.disconnect();
        } catch (e) {
          /* no-op */
        }
      }
      if (leftVideoRef.current) leftVideoRef.current.innerHTML = "";
      if (rightVideoRef.current) rightVideoRef.current.innerHTML = "";
    };
  }, [activeStream?.room_name, user?.id]);

  // Canlı yayımları çəkirik
  const fetchStreams = async () => {
    try {
      const res = await fetch("/api/live");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStreams(json.data);
          if (!activeStream && json.data.length > 0) {
            setActiveStream(json.data[0]);
            setComments(json.data[0].comments || []);
          } else if (activeStream) {
            const updated = json.data.find((s) => s.id === activeStream.id);
            if (updated) {
              setActiveStream(updated);
              setComments(updated.comments || []);
            }
          }
        }
      }
    } catch (err) {
      console.error("Yayımlar yüklənmədi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
    const interval = setInterval(fetchStreams, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Səsvermə (Vote)
  const handleVote = async (side) => {
    if (!activeStream) return;
    
    if (side === "left" && activeStream.left_realtor) {
      activeStream.left_realtor.score = (activeStream.left_realtor.score || 0) + 15;
    } else if (side === "right" && activeStream.right_realtor) {
      activeStream.right_realtor.score = (activeStream.right_realtor.score || 0) + 15;
    }
    setActiveStream({ ...activeStream });

    try {
      await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          streamId: activeStream.id,
          side,
        }),
      });
    } catch (err) {
      console.error("Səsvermə xətası:", err);
    }
  };

  // Hədiyyə göndərmə
  const handleSendGift = async (gift) => {
    if (!activeStream) return;

    const giftId = Date.now();
    setFloatingGifts((prev) => [
      ...prev,
      { id: giftId, icon: gift.icon, side: selectedSide },
    ]);
    setTimeout(() => {
      setFloatingGifts((prev) => prev.filter((g) => g.id !== giftId));
    }, 2000);

    const sender = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "İstifadəçi";

    const giftComment = {
      id: Date.now(),
      user: "🎁 MÜLKERA PK",
      text: `${sender} ${selectedSide === "left" ? activeStream.left_realtor?.name : activeStream.right_realtor?.name} üçün ${gift.name} ${gift.icon} göndərdi! (+${gift.points} xal)`,
      isGift: true,
      time: "İndicə",
    };
    setComments((prev) => [...prev, giftComment]);

    try {
      const res = await fetch("/api/live/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streamId: activeStream.id,
          senderId: user?.id || null,
          senderName: sender,
          giftId: gift.id,
          giftName: gift.name,
          giftIcon: gift.icon,
          price: gift.price,
          points: gift.points,
          targetSide: selectedSide,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.stream) {
        setActiveStream(data.data.stream);
      } else {
        fetchStreams();
      }
    } catch (err) {
      console.error("Hədiyyə xətası:", err);
    }
  };

  // Canlı şərh göndərmə
  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !activeStream) return;

    const sender = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "İzləyici";
    const newMsg = {
      id: Date.now(),
      user: sender,
      text: commentText.trim(),
      time: "İndicə",
    };

    setComments((prev) => [...prev, newMsg]);
    setCommentText("");

    try {
      await fetch("/api/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "comment",
          streamId: activeStream.id,
          senderId: user?.id || null,
          senderName: sender,
          text: newMsg.text,
        }),
      });
    } catch (err) {
      console.error("Şərh xətası:", err);
    }
  };

  // Yeni yayım yaratma
  const handleCreateStream = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/live/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
          isPk: isPkMode,
          hostId: user?.id || "r1"
        }),
      });

      if (res.ok) {
        setShowNewStreamModal(false);
        setNewTitle("");
        setNewDesc("");
        fetchStreams();
      }
    } catch (err) {
      console.error("Yayım başlama xətası:", err);
    }
  };

  const leftScore = activeStream?.left_realtor?.score || 1000;
  const rightScore = activeStream?.right_realtor?.score || 1000;
  const totalScore = leftScore + rightScore || 2000;
  const leftPct = Math.round((leftScore / totalScore) * 100);
  const rightPct = 100 - leftPct;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-copper border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold tracking-wide">Canlı Yayımlar və PK Arenası yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 pb-16">
      {/* Üst Banner / Təqdimat */}
      <div className="border-b border-slate-800 bg-[#0B1222] px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-red-600/20 border border-red-500/40 text-red-400 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase animate-pulse">
              <span className="w-2 h-2 rounded-full bg-red-500" /> CANLI PK ARENASI
            </div>
            <p className="text-xs sm:text-sm text-slate-300 font-medium hidden md:block">
              Top Rieltorların interaktiv əmlak döyüşü və virtual turları
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewStreamModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-copper to-amber-600 hover:from-copper-light hover:to-amber-500 text-white text-xs font-bold transition shadow-lg shadow-copper/20 cursor-pointer"
            >
              <FiPlus /> Canlı Yayım Başlat
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Əsas Canlı Yayım Pəncərəsi və Çat Sahəsi */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Sol və Mərkəz: PK Arenası */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              {/* Üst İnfo Bar */}
              <div className="absolute top-0 inset-x-0 z-30 p-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-md">
                    <FiRadio className="animate-spin" /> CANLI
                  </div>
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-slate-200 border border-white/10">
                    <FiUsers className="text-copper" /> {activeStream?.viewers_count || 850} izləyici
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold text-amber-400 border border-amber-500/30">
                  <FiClock /> Qalan vaxt: 04:25
                </div>

                {videoConnected ? (
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Canlı Video Aktiv
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/70 border border-slate-700 text-slate-400 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                    Video gözlənilir
                  </div>
                )}
              </div>

              {/* PK Split Screen */}
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 relative min-h-[380px] sm:min-h-[440px]">
                {/* Sol Tərəf */}
                <div className="relative group overflow-hidden flex flex-col justify-between p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/30 to-transparent">
                  <img
                    src={activeStream?.left_realtor?.property?.image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1000"}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover -z-10 brightness-75 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div
                    ref={leftVideoRef}
                    className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                  />

                  <div className="flex items-center gap-3 pt-12">
                    <img
                      src={activeStream?.left_realtor?.avatar || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200"}
                      alt=""
                      className="w-12 h-12 rounded-full border-2 border-blue-500 shadow-md object-cover"
                    />
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                        {activeStream?.left_realtor?.name || "Ramil Şirinov"}
                        <FiCheckCircle className="text-blue-400 text-xs" />
                      </h4>
                      <p className="text-[11px] text-slate-300 font-medium">
                        {activeStream?.left_realtor?.agency || "MÜLKERA Premium"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-6 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 mt-auto">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">1-ci Seçim</span>
                      <h5 className="text-sm font-bold text-white line-clamp-1">
                        {activeStream?.left_realtor?.property?.title || "Ağ Şəhər Bulvarı 4 Otaqlı Lüks"}
                      </h5>
                      <p className="text-base font-black text-amber-400 mt-0.5">
                        {activeStream?.left_realtor?.property?.price || "490,000 AZN"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleVote("left")}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FiZap /> Səs Ver (+15)
                      </button>
                      {activeStream?.left_realtor?.property?.listing_id && (
                        <Link
                          href={`/listings/${activeStream.left_realtor.property.listing_id}`}
                          className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiExternalLink /> Elana Bax
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mərkəzi PK Nişanı */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none hidden md:flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 via-red-500 to-copper p-1 shadow-2xl animate-bounce">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                      <span className="text-lg font-black tracking-tighter text-amber-400">VS</span>
                    </div>
                  </div>
                </div>

                {/* Sağ Tərəf */}
                <div className="relative group overflow-hidden flex flex-col justify-between p-4 sm:p-5 bg-gradient-to-t from-black/90 via-black/30 to-transparent">
                  <img
                    src={activeStream?.right_realtor?.property?.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1000"}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover -z-10 brightness-75 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div
                    ref={rightVideoRef}
                    className="absolute inset-0 w-full h-full [&>video]:w-full [&>video]:h-full [&>video]:object-cover"
                  />

                  <div className="flex items-center gap-3 pt-12 md:justify-end">
                    <div className="text-right">
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 justify-end">
                        <FiCheckCircle className="text-red-400 text-xs" />
                        {activeStream?.right_realtor?.name || "Elmir Məmmədov"}
                      </h4>
                      <p className="text-[11px] text-slate-300 font-medium">
                        {activeStream?.right_realtor?.agency || "Bakı Əmlak Mərkəzi"}
                      </p>
                    </div>
                    <img
                      src={activeStream?.right_realtor?.avatar || "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200"}
                      alt=""
                      className="w-12 h-12 rounded-full border-2 border-red-500 shadow-md object-cover"
                    />
                  </div>

                  <div className="space-y-3 pt-6 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 mt-auto">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">2-ci Seçim</span>
                      <h5 className="text-sm font-bold text-white line-clamp-1">
                        {activeStream?.right_realtor?.property?.title || "Nəsimi r. 3 Otaqlı Modern Mənzil"}
                      </h5>
                      <p className="text-base font-black text-amber-400 mt-0.5">
                        {activeStream?.right_realtor?.property?.price || "245,000 AZN"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {activeStream?.right_realtor?.property?.listing_id && (
                        <Link
                          href={`/listings/${activeStream.right_realtor.property.listing_id}`}
                          className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                        >
                          <FiExternalLink /> Elana Bax
                        </Link>
                      )}
                      <button
                        onClick={() => handleVote("right")}
                        className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <FiZap /> Səs Ver (+15)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PK Skor Paneli */}
              <div className="bg-[#0c1427] p-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-blue-400 flex items-center gap-1.5">
                    🔵 {activeStream?.left_realtor?.name}: <strong>{leftScore.toLocaleString()} xal</strong> ({leftPct}%)
                  </span>
                  <span className="text-red-400 flex items-center gap-1.5">
                    ({rightPct}%) <strong>{rightScore.toLocaleString()} xal</strong> :{activeStream?.right_realtor?.name} 🔴
                  </span>
                </div>

                <div className="w-full h-3.5 rounded-full overflow-hidden bg-slate-800 flex shadow-inner">
                  <div
                    style={{ width: `${leftPct}%` }}
                    className="bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500 h-full"
                  />
                  <div
                    style={{ width: `${rightPct}%` }}
                    className="bg-gradient-to-r from-amber-500 to-red-600 transition-all duration-500 h-full"
                  />
                </div>
              </div>

              {/* Virtual Hədiyyələr Paneli */}
              <div className="bg-[#0c1427] rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-copper uppercase tracking-wider flex items-center gap-1.5">
                      <FiAward /> Dəstək Ol və Xal Qazandır (Virtual Hədiyyələr)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Seçdiyiniz rieltora hədiyyə göndərərək onun reytinqini və qələbə şansını artırın
                    </p>
                  </div>

                  <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => setSelectedSide("left")}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        selectedSide === "left" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      🔵 Sol ({activeStream?.left_realtor?.name?.split(" ")[0]})
                    </button>
                    <button
                      onClick={() => setSelectedSide("right")}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        selectedSide === "right" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      🔴 Sağ ({activeStream?.right_realtor?.name?.split(" ")[0]})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {GIFTS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => handleSendGift(g)}
                      className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 hover:border-amber-500/50 transition group cursor-pointer"
                    >
                      <span className="text-2xl group-hover:scale-125 transition-transform duration-200">
                        {g.icon}
                      </span>
                      <span className="text-xs font-bold text-slate-200 mt-1">{g.name}</span>
                      <span className="text-[10px] text-amber-400 font-extrabold mt-0.5">{g.price} AZN</span>
                      <span className="text-[9px] text-slate-400">+{g.points} xal</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sağ Sütun: Canlı Çat */}
          <div className="bg-[#0c1427] rounded-3xl border border-slate-800 shadow-xl flex flex-col h-[600px] overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div className="flex items-center gap-2">
                <FiMessageCircle className="text-copper" />
                <h3 className="text-sm font-bold text-white">Canlı Çat və Suallar</h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Aktiv
              </span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {comments.map((c, i) => (
                <div
                  key={c.id || i}
                  className={`p-2.5 rounded-xl ${
                    c.isGift
                      ? "bg-amber-500/10 border border-amber-500/30 text-amber-300"
                      : "bg-slate-900/80 border border-slate-800/80"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-extrabold ${c.isGift ? "text-amber-400" : "text-copper"}`}>
                      {c.user}
                    </span>
                    <span className="text-[10px] text-slate-500">{c.time || "İndicə"}</span>
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">{c.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-900/40 flex items-center gap-2 text-base">
              {["👏", "🔥", "🏠", "💎", "❤️", "👍"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCommentText((prev) => prev + " " + emoji)}
                  className="hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <form onSubmit={handleSendComment} className="p-3 border-t border-slate-800 flex gap-2 bg-slate-900">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Rieltorlara sualınızı verin..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 outline-none focus:border-copper"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl bg-copper hover:bg-copper-light text-white transition text-xs font-bold cursor-pointer"
              >
                <FiSend />
              </button>
            </form>
          </div>
        </div>

        {/* Bütün Canlı Yayımlar Siyahısı */}
        <div className="pt-8 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white font-heading">
                Bütün Canlı Əmlak Turları ({streams.length})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rieltorların fərdi canlı yayımları və arxiv video baxışları
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {streams.map((s) => (
              <div
                key={s.id}
                onClick={() => {
                  setActiveStream(s);
                  setComments(s.comments || []);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`p-4 rounded-2xl border transition cursor-pointer group ${
                  activeStream?.id === s.id
                    ? "bg-slate-800/80 border-copper shadow-lg"
                    : "bg-[#0c1427] border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="relative h-40 rounded-xl overflow-hidden mb-3 bg-slate-800">
                  <img
                    src={s.left_realtor?.property?.image || "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600"}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> CANLI
                  </div>
                  {s.is_pk && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                      PK ARENASI
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                    <FiUsers /> {s.viewers_count || 320}
                  </div>
                </div>

                <h4 className="text-sm font-bold text-white group-hover:text-copper transition line-clamp-1">
                  {s.title || "Premium Əmlak Təqdimatı"}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                  {s.left_realtor?.name} vs {s.right_realtor?.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Yeni Yayım Başlatma Modalı */}
      {showNewStreamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0c1427] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowNewStreamModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <FiX size={20} />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white font-heading">Yeni Canlı Yayım / PK Başlat</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Müştərilərinizə əmlakınızı canlı olaraq təqdim edin
              </p>
            </div>

            <form onSubmit={handleCreateStream} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Yayım Başlığı</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Məs: Ağ Şəhər Penthouse Canlı Turu"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 outline-none focus:border-copper"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Açıqlama</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Yayım haqqında qısa məlumat..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 outline-none focus:border-copper resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs font-bold text-slate-300">PK Arena (Döyüş) Rejimi</span>
                <input
                  type="checkbox"
                  checked={isPkMode}
                  onChange={(e) => setIsPkMode(e.target.checked)}
                  className="w-4 h-4 accent-copper cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewStreamModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-copper hover:bg-copper-light text-white text-xs font-bold transition shadow-lg shadow-copper/20 cursor-pointer"
                >
                  Yayımı Başlat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}