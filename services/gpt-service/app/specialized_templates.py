from .templates import ArcTemplate

# Additional specialized templates
SPECIALIZED_TEMPLATES = {
    "trance_journey": ArcTemplate(
        name="Trance Journey",
        description="Progressive trance journey with emotional peaks",
        stages=[
            "ambient_intro",
            "progressive_build",
            "first_release",
            "melodic_journey",
            "main_climax",
            "ethereal_breakdown",
            "uplifting_finale"
        ],
        stage_descriptions={
            "ambient_intro": "Atmospheric start (128-132 BPM)",
            "progressive_build": "Progressive elements introduction",
            "first_release": "First emotional release",
            "melodic_journey": "Melodic progression",
            "main_climax": "Main euphoric peak",
            "ethereal_breakdown": "Deep emotional moment",
            "uplifting_finale": "Uplifting closure"
        },
        energy_curve=[0.3, 0.5, 0.8, 0.6, 1.0, 0.4, 0.9],
        bpm_range={
            "ambient_intro": (128, 132),
            "progressive_build": (132, 134),
            "first_release": (134, 136),
            "melodic_journey": (134, 138),
            "main_climax": (138, 140),
            "ethereal_breakdown": (134, 136),
            "uplifting_finale": (138, 142)
        },
        mood_targets={
            "ambient_intro": {"valence": 0.5, "arousal": 0.3},
            "main_climax": {"valence": 1.0, "arousal": 1.0},
            "uplifting_finale": {"valence": 0.9, "arousal": 0.8}
        }
    ),

    "deep_minimal": ArcTemplate(
        name="Deep Minimal Journey",
        description="Minimalistic deep techno progression",
        stages=[
            "deep_start",
            "minimal_groove",
            "micro_house",
            "dub_techno",
            "hypnotic_peak",
            "minimal_break",
            "deep_closure"
        ],
        stage_descriptions={
            "deep_start": "Deep, subtle beginning (122-124 BPM)",
            "minimal_groove": "Establish minimal groove",
            "micro_house": "Micro-house elements",
            "dub_techno": "Dub techno atmosphere",
            "hypnotic_peak": "Hypnotic climax",
            "minimal_break": "Stripped back moment",
            "deep_closure": "Deep, atmospheric end"
        },
        energy_curve=[0.3, 0.4, 0.6, 0.7, 0.8, 0.5, 0.4],
        bpm_range={
            "deep_start": (122, 124),
            "minimal_groove": (123, 125),
            "micro_house": (124, 126),
            "dub_techno": (125, 127),
            "hypnotic_peak": (126, 128),
            "minimal_break": (124, 126),
            "deep_closure": (122, 124)
        },
        mood_targets={
            "deep_start": {"valence": 0.4, "arousal": 0.3},
            "hypnotic_peak": {"valence": 0.6, "arousal": 0.8},
            "deep_closure": {"valence": 0.5, "arousal": 0.4}
        }
    ),

    "tribal_house": ArcTemplate(
        name="Tribal House Ritual",
        description="Tribal-influenced house journey",
        stages=[
            "tribal_intro",
            "percussion_build",
            "ethnic_fusion",
            "tribal_peak",
            "shamanic_journey",
            "ritual_groove",
            "tribal_finale"
        ],
        stage_descriptions={
            "tribal_intro": "Tribal percussion intro (124-126 BPM)",
            "percussion_build": "Layer percussion elements",
            "ethnic_fusion": "Blend ethnic elements",
            "tribal_peak": "Full tribal energy",
            "shamanic_journey": "Mystical progression",
            "ritual_groove": "Ritualistic groove",
            "tribal_finale": "Powerful closing"
        },
        energy_curve=[0.4, 0.6, 0.7, 0.9, 0.8, 0.9, 1.0],
        bpm_range={
            "tribal_intro": (124, 126),
            "percussion_build": (125, 127),
            "ethnic_fusion": (126, 128),
            "tribal_peak": (127, 129),
            "shamanic_journey": (126, 128),
            "ritual_groove": (127, 129),
            "tribal_finale": (128, 130)
        },
        mood_targets={
            "tribal_intro": {"valence": 0.6, "arousal": 0.5},
            "tribal_peak": {"valence": 0.8, "arousal": 0.9},
            "tribal_finale": {"valence": 0.9, "arousal": 1.0}
        }
    ),

    "ambient_chill": ArcTemplate(
        name="Ambient Chill Session",
        description="Deep ambient journey for relaxation",
        stages=[
            "floating_start",
            "drone_layer",
            "atmospheric_build",
            "celestial_peak",
            "cosmic_journey",
            "ethereal_float",
            "peaceful_end"
        ],
        stage_descriptions={
            "floating_start": "Gentle ambient start (70-80 BPM)",
            "drone_layer": "Add drone layers",
            "atmospheric_build": "Build atmosphere",
            "celestial_peak": "Celestial climax",
            "cosmic_journey": "Deep space journey",
            "ethereal_float": "Ethereal floating",
            "peaceful_end": "Peaceful resolution"
        },
        energy_curve=[0.2, 0.3, 0.4, 0.5, 0.4, 0.3, 0.2],
        bpm_range={
            "floating_start": (70, 80),
            "drone_layer": (75, 85),
            "atmospheric_build": (80, 90),
            "celestial_peak": (85, 95),
            "cosmic_journey": (80, 90),
            "ethereal_float": (75, 85),
            "peaceful_end": (70, 80)
        },
        mood_targets={
            "floating_start": {"valence": 0.6, "arousal": 0.2},
            "celestial_peak": {"valence": 0.8, "arousal": 0.5},
            "peaceful_end": {"valence": 0.7, "arousal": 0.2}
        }
    )
}

# Update main templates dict with specialized templates
def get_all_templates():
    from .templates import TEMPLATES
    return {**TEMPLATES, **SPECIALIZED_TEMPLATES}